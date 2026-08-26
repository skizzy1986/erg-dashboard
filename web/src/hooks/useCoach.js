import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { useTSSHistory } from './useTSSHistory.js';
import { useVitals } from './useVitals.js';
import { useSessions } from './useSessions.js';
import { calcTrainingLoad, tsbBand } from '../utils/trainingLoad.js';
import {
  COMPLETED_STATUSES,
  PLANNED_STATUS,
} from '../constants/sessionStatus.js';
import { toISODate, toLogDate } from '../utils/dateFormat.js';
import { parseDurationMinutes } from '../utils/duration.js';
import { captureError } from '../utils/sentry.js';

// One microcycle, with room for the two-a-day Wednesday — a training week runs
// to more than seven rows. The questions this context serves ("how's my
// training load looking", "is it safe to add intensity today") are answered by
// that window; the rest of useSessions' 50 is history CTL/ATL already
// compresses, costing prompt tokens without changing the answer.
const RECENT_SESSION_COUNT = 8;

// The local calendar day, not the UTC one. Perth is UTC+8, so
// toISOString() names yesterday for the whole Perth morning — exactly when
// readiness is checked and today's session asked about. toLogDate reads local
// date fields; toISODate converts its M/D/YY back to ISO.
export function todayISO() {
  return toISODate(toLogDate(new Date()));
}

export function buildTrainingContext(
  latestLoad,
  latestVitals,
  readinessScore,
  readinessLabel,
  recentSessions,
  todayPlanned,
  readinessPartial = false
) {
  const today = todayISO();
  const lines = [`CURRENT TRAINING DATA (as of ${today}):`];

  if (latestLoad) {
    // Boundaries match the dashboard's own bands (App.jsx, MobileAnalytics,
    // LoadTooltip) so the Coach and the screen never disagree about the same
    // number. They are classic-TSS values — #208 rescaled sessionLoad from
    // sRPE-hours, and the old GREEN cut of 5 was a pre-rescale figure that
    // would now read "fresh" over most of the dashboard's neutral band.
    const tsbSignal = tsbBand(latestLoad.tsb)?.signal ?? 'UNKNOWN';
    lines.push(
      `TSB: ${latestLoad.tsb} (${tsbSignal}) | CTL: ${latestLoad.ctl} | ATL: ${latestLoad.atl}`
    );
  }

  if (latestVitals) {
    const rhr = latestVitals.rhr != null ? latestVitals.rhr : '—';
    const hrv = latestVitals.hrv != null ? latestVitals.hrv : '—';
    const sleep = latestVitals.sleep != null ? latestVitals.sleep : '—';
    // computeReadiness returns a null score with status NO DATA when there is
    // no RHR to score (#218). Interpolating that reads "null/100", and the
    // whole point of that change was that absent data must not reach the Coach
    // dressed as a verdict — the old code scored a missing row 0 FATIGUED and
    // it was believed. Report the raw vitals and say the score is missing.
    // `partial` marks a score computed without HRV or sleep; the Coach is told
    // so it can weight the number accordingly rather than treat it as complete.
    const verdict =
      readinessScore == null
        ? `Readiness: unavailable (${readinessLabel})`
        : `Readiness: ${readinessScore}/100 ${readinessLabel}${
            readinessPartial ? ' (partial — scored without HRV or sleep)' : ''
          }`;
    lines.push(`${verdict} | RHR: ${rhr} | HRV: ${hrv}ms | Sleep: ${sleep}h`);
  }

  if (todayPlanned) {
    const label = todayPlanned.label ? ` — ${todayPlanned.label}` : '';
    lines.push(`Today's session: ${todayPlanned.type}${label}`);
  }

  if (recentSessions?.length) {
    lines.push('Recent sessions (newest first):');
    recentSessions.forEach((s) => {
      // sessions.duration is free text — "45:00", "60min", "1h4m" — so it has
      // to be parsed, not interpolated, or the prompt reads "45:00min".
      const mins = parseDurationMinutes(s.duration);
      const dur = mins > 0 ? ` ${Math.round(mins)}min` : '';
      const rpe = s.srpe ? ` sRPE ${s.srpe}` : '';
      // ISO to match the header line: sessions.date is TEXT "M/D/YY", and
      // day/month order is ambiguous to a reader that isn't told which it is.
      lines.push(`  ${toISODate(s.date) || s.date}: ${s.type}${dur}${rpe}`);
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

  const { data: messages = [] } = useQuery({
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
  const sessionsQuery = useSessions();

  const latestLoad = useMemo(() => {
    const series = calcTrainingLoad(tssQuery.data ?? []);
    return series[series.length - 1] ?? null;
  }, [tssQuery.data]);

  const { recentSessions, todayPlanned } = useMemo(() => {
    const rows = sessionsQuery.data ?? [];
    const iso = todayISO();
    return {
      recentSessions: rows
        .filter((s) => COMPLETED_STATUSES.includes(s.status))
        .slice(0, RECENT_SESSION_COUNT),
      // Both sides through toISODate: sessions.date is TEXT "M/D/YY", so
      // comparing it to an ISO day directly never matches.
      todayPlanned:
        rows.find(
          (s) => s.status === PLANNED_STATUS && toISODate(s.date) === iso
        ) ?? null,
    };
  }, [sessionsQuery.data]);

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
      // postgrest-js resolves with `{ error }` instead of rejecting, so an
      // insert whose result is discarded fails invisibly. Report and carry on:
      // the message is already in the query cache and the turn still runs.
      const { error: userInsertErr } = await supabase
        .from('coach_messages')
        .insert({ role: 'user', content: userText, model });
      if (userInsertErr) {
        captureError(userInsertErr, {
          source: 'useCoach',
          op: 'insertUserMessage',
        });
      }

      const currentMessages =
        queryClient.getQueryData(['coach_messages']) ?? [];
      const apiMessages = currentMessages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      // Assembled here, not in the edge function: every input is already
      // derived by tested client utilities (sessionLoad's power fallback,
      // COMPLETED_STATUSES, computeReadiness, the live CP/FTP anchors), and
      // rebuilding that in Deno is what left the Coach contextless.
      const context = buildTrainingContext(
        latestLoad,
        vitals.latest,
        vitals.readinessScore,
        vitals.readinessLabel,
        recentSessions,
        todayPlanned,
        vitals.readiness?.partial ?? false
      );

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
        body: JSON.stringify({ messages: apiMessages, model, context }),
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
              const { error: stopInsertErr } = await supabase
                .from('coach_messages')
                .insert({ role: 'assistant', content: finalContent, model });
              if (stopInsertErr) {
                captureError(stopInsertErr, {
                  source: 'useCoach',
                  op: 'insertAssistantMessage',
                  finalised: true,
                });
              }
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
        const { error: fallbackInsertErr } = await supabase
          .from('coach_messages')
          .insert({ role: 'assistant', content: finalContent, model });
        if (fallbackInsertErr) {
          captureError(fallbackInsertErr, {
            source: 'useCoach',
            op: 'insertAssistantMessage',
            finalised: false,
          });
        }
        queryClient.setQueryData(['coach_messages'], (old) => [
          ...(old ?? []),
          assistantMsg,
        ]);
        setStreamingContent('');
        streamingRef.current = '';
        setIsStreaming(false);
      }
    } catch (err) {
      captureError(err, { source: 'useCoach', op: 'sendMessage', model });
      setError(err.message || 'Failed to get a response');
      setIsStreaming(false);
      setStreamingContent('');
      streamingRef.current = '';
    }
  };

  const clearHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error: delErr } = await supabase
        .from('coach_messages')
        .delete()
        .eq('user_id', user.id);
      // A failed delete leaves the rows on the server, so clearing the list
      // here would only hide them until the next refetch brought them back.
      if (delErr) {
        captureError(delErr, { source: 'useCoach', op: 'clearHistory' });
        setError('Could not clear history — please try again');
        return;
      }
      queryClient.setQueryData(['coach_messages'], []);
    } catch (err) {
      captureError(err, { source: 'useCoach', op: 'clearHistory' });
      setError('Could not clear history — please try again');
    }
  };

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    model,
    setModel,
    sendMessage,
    clearHistory,
    vitals,
    latestLoad,
  };
}
