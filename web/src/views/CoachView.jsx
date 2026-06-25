import { useState, useEffect, useRef } from 'react';
import { useCoach } from '../hooks/useCoach.js';
import { calcTrainingLoad } from '../utils/trainingLoad.js';

const C = {
  bg: '#08080d',
  panel: '#1a1a2e',
  border: '#4a4a68',
  cyan: '#00d4ff',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  err: '#ff2d55',
  userBubble: '#2a2a48',
  userBubbleBorder: '#4a4a68',
  assistantBorder: '#00d4ff',
};

const STARTER_PROMPTS = [
  "How's my training load looking?",
  'What should I focus on this week?',
  'Is it safe to add intensity today?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        background: isUser ? C.userBubble : C.panel,
        border: isUser ? `1px solid ${C.userBubbleBorder}` : 'none',
        borderLeft: isUser ? undefined : `3px solid ${C.assistantBorder}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: C.text,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {msg.content}
    </div>
  );
}

export default function CoachView() {
  const {
    messages,
    streamingContent,
    isStreaming,
    error,
    model,
    setModel,
    sendMessage,
    clearHistory,
    vitals,
    tssQuery,
  } = useCoach();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const tssData = tssQuery.data ?? [];
  const loadData = tssData.length ? calcTrainingLoad(tssData) : [];
  const latestLoad = loadData[loadData.length - 1] ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const tsbLabel = latestLoad
    ? `TSB ${latestLoad.tsb} · CTL ${latestLoad.ctl} · ATL ${latestLoad.atl}`
    : null;
  const readinessLabel =
    vitals.latest && vitals.readinessScore != null
      ? `Readiness ${vitals.readinessScore} ${vitals.readinessLabel}`
      : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 180px)',
        minHeight: 400,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: C.cyan,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            COACH
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'haiku', label: 'QUICK' },
              { key: 'sonnet', label: 'COACHING' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setModel(key)}
                style={{
                  background: model === key ? C.panel : 'transparent',
                  border: `1px solid ${model === key ? C.cyan : C.border}`,
                  color: model === key ? C.cyan : C.muted,
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 9,
                  letterSpacing: 0.5,
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Clear all coaching history?')) clearHistory();
          }}
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.muted,
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 9,
            letterSpacing: 0.5,
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          CLEAR
        </button>
      </div>

      {/* Status badge */}
      {(tsbLabel || readinessLabel) && (
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            marginBottom: 10,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {[tsbLabel, readinessLabel].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '4px 0',
        }}
      >
        {messages.length === 0 && !isStreaming && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '24px 0',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 8,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: 1,
              }}
            >
              ASK YOUR COACH
            </div>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: '10px 14px',
                  color: C.text,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.4,
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streamingContent && (
          <div
            style={{
              alignSelf: 'flex-start',
              maxWidth: '80%',
              background: C.panel,
              borderLeft: `3px solid ${C.assistantBorder}`,
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: C.text,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {streamingContent}
            <span style={{ opacity: 0.7 }}>▌</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            color: C.err,
            fontSize: 11,
            padding: '6px 0',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {error}
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach… (Enter to send, Shift+Enter for newline)"
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '10px 12px',
            color: C.text,
            fontSize: 13,
            fontFamily: "'DM Mono', monospace",
            resize: 'none',
            minHeight: 44,
            maxHeight: 120,
            opacity: isStreaming ? 0.5 : 1,
            outline: 'none',
            overflowY: 'auto',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            background: C.cyan,
            color: C.bg,
            border: 'none',
            borderRadius: 6,
            padding: '0 16px',
            height: 44,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isStreaming || !input.trim() ? 0.4 : 1,
            fontFamily: "'DM Mono', monospace",
            flexShrink: 0,
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
