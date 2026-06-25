import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { useTSSHistory } from './useTSSHistory.js';
import { useVitals } from './useVitals.js';
import { useSessions } from './useSessions.js';
import { calcTrainingLoad } from '../utils/trainingLoad.js';

export function buildTrainingContext(
  latestLoad,
  latestVitals,
  readinessScore,
  readinessLabel,
  recentSessions,
  todayPlanned
) {
  const today = new Date().toISOString().split('T')[0];
  const lines = [`CURRENT TRAINING DATA (as of ${today}):`];

  if (latestLoad) {
    const tsbSignal =
      latestLoad.tsb > 5 ? 'GREEN' : latestLoad.tsb > -10 ? 'AMBER' : 'RED';
    lines.push(
      `TSB: ${latestLoad.tsb} (${tsbSignal}) | CTL: ${latestLoad.ctl} | ATL: ${latestLoad.atl}`
    );
  }

  if (latestVitals) {
    const rhr = latestVitals.rhr != null ? latestVitals.rhr : '—';
    const hrv = latestVitals.hrv != null ? latestVitals.hrv : '—';
    const sleep = latestVitals.sleep != null ? latestVitals.sleep : '—';
    lines.push(
      `Readiness: ${readinessScore}/100 ${readinessLabel} | RHR: ${rhr} | HRV: ${hrv}ms | Sleep: ${sleep}h`
    );
  }

  if (todayPlanned) {
    const label = todayPlanned.label ? ` — ${todayPlanned.label}` : '';
    lines.push(`Today's session: ${todayPlanned.type}${label}`);
  }

  if (recentSessions?.length) {
    lines.push('Recent sessions (newest first):');
    recentSessions.forEach((s) => {
      const dur = s.duration ? ` ${s.duration}min` : '';
      const rpe = s.srpe ? ` sRPE ${s.srpe}` : '';
      lines.push(`  ${s.date}: ${s.type}${dur}${rpe}`);
    });
  }

  return lines.join('\n');
}

export function useCoach() {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModelState] = useState(
    () => localStorage.getItem('coach_model_pref') || 'sonnet'
  );

  const streamingRef = useRef('');

  const { data: messages = [], isSuccess: messagesReady } = useQuery({
    queryKey: ['coach_messages'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('coach_messages')
        .select('role, content, model, created_at')
        .order('created_at', { ascending: true })
        .limit(100);
      if (err) throw err;
      return data ?? [];
    },
    staleTime: 300_000,
    retry: 2,
  });

  const tssQuery = useTSSHistory();
  const vitals = useVitals();
  const sessions = useSessions();

  const today = new Date().toISOString().split('T')[0];
  const allSessions = sessions.data ?? [];
  const todayPlanned =
    allSessions.find((s) => s.status === 'planned' && s.date === today) ?? null;

  const setModel = (m) => {
    setModelState(m);
    localStorage.setItem('coach_model_pref', m);
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg = {
      role: 'user',
      content: userText,
      model,
      created_at: new Date().toISOString(),
    };
    queryClient.setQueryData(['coach_messages'], (old) => [
      ...(old ?? []),
      userMsg,
    ]);

    setIsStreaming(true);
    setStreamingContent('');
    streamingRef.current = '';
    setError(null);

    try {
      await supabase
        .from('coach_messages')
        .insert({ role: 'user', content: userText, model });

      const tssData = tssQuery.data ?? [];
      const loadData = tssData.length ? calcTrainingLoad(tssData) : [];
      const latestLoad = loadData[loadData.length - 1] ?? null;

      const recentLogged = allSessions
        .filter((s) => s.status === 'logged')
        .slice(0, 5);

      const context = buildTrainingContext(
        latestLoad,
        vitals.latest,
        vitals.readinessScore,
        vitals.readinessLabel,
        recentLogged,
        todayPlanned
      );

      const currentMessages =
        queryClient.getQueryData(['coach_messages']) ?? [];
      const apiMessages = currentMessages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/coach-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: apiMessages, context, model }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Coach error ${res.status}: ${errText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalised = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              streamingRef.current += parsed.delta.text;
              setStreamingContent(streamingRef.current);
            } else if (parsed.type === 'message_stop') {
              finalised = true;
              const finalContent = streamingRef.current;
              const assistantMsg = {
                role: 'assistant',
                content: finalContent,
                model,
                created_at: new Date().toISOString(),
              };
              await supabase
                .from('coach_messages')
                .insert({ role: 'assistant', content: finalContent, model });
              queryClient.setQueryData(['coach_messages'], (old) => [
                ...(old ?? []),
                assistantMsg,
              ]);
              setStreamingContent('');
              streamingRef.current = '';
              setIsStreaming(false);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      if (!finalised && streamingRef.current) {
        const finalContent = streamingRef.current;
        const assistantMsg = {
          role: 'assistant',
          content: finalContent,
          model,
          created_at: new Date().toISOString(),
        };
        await supabase
          .from('coach_messages')
          .insert({ role: 'assistant', content: finalContent, model });
        queryClient.setQueryData(['coach_messages'], (old) => [
          ...(old ?? []),
          assistantMsg,
        ]);
        setStreamingContent('');
        streamingRef.current = '';
        setIsStreaming(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to get a response');
      setIsStreaming(false);
      setStreamingContent('');
      streamingRef.current = '';
    }
  };

  const clearHistory = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('coach_messages').delete().eq('user_id', user.id);
    queryClient.setQueryData(['coach_messages'], []);
  };

  return {
    messages,
    messagesReady,
    streamingContent,
    isStreaming,
    error,
    model,
    setModel,
    sendMessage,
    clearHistory,
    vitals,
    tssQuery,
    todayPlanned,
  };
}
