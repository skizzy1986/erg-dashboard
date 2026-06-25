import { useState, useEffect, useRef } from 'react';
import { useCoach } from '../hooks/useCoach.js';
import { calcTrainingLoad } from '../utils/trainingLoad.js';
import { PHASE_CONTEXT } from '../constants/schedule.js';

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
  green: '#34d399',
  amber: '#fbb040',
};

// mirrors getRosterMode in erg-dashboard.jsx — update ROSTER_ANCHOR if roster changes
const ROSTER_ANCHOR = new Date(2026, 5, 23); // Tue 23 Jun 2026 — FIFO begins (fly out)
function getRosterMode(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(
    ROSTER_ANCHOR.getFullYear(),
    ROSTER_ANCHOR.getMonth(),
    ROSTER_ANCHOR.getDate()
  );
  const daysDiff = Math.floor((d - anchor) / 86400000);
  if (daysDiff < 0) return 'home';
  const weekNum = Math.floor(daysDiff / 7);
  return weekNum % 2 === 0 ? 'fifo' : 'home';
}

const CP_TEST_DATE = '2026-07-01';

const FALLBACK_CHIPS = [
  "How's my training load looking?",
  'What should I focus on this week?',
  'Is it safe to add intensity today?',
  'What should I prioritise in base phase?',
];

function getChips(latestLoad, vitals, rosterMode, todayPlanned) {
  const chips = [];

  if (rosterMode === 'fifo') {
    chips.push("I'm on shift — what's the minimum effective dose?");
  }

  if (latestLoad && latestLoad.tsb < -10) {
    chips.push('TSB is in the red — should I dial back today?');
  }

  if (latestLoad && latestLoad.tsb > 10) {
    chips.push("I'm well-rested — can I push volume?");
  }

  if (vitals.latest && vitals.readinessScore < 60) {
    chips.push('Readiness is low — how do I respond?');
  }

  const today = new Date().toISOString().split('T')[0];
  const daysToTest = Math.round(
    (new Date(CP_TEST_DATE) - new Date(today)) / 86400000
  );
  if (daysToTest >= 0 && daysToTest <= 7) {
    chips.push(
      `CP test in ${daysToTest} day${daysToTest === 1 ? '' : 's'} — how do I prepare?`
    );
  }

  if (todayPlanned) {
    chips.push("Talk me through today's session");
  }

  for (const f of FALLBACK_CHIPS) {
    if (chips.length >= 4) break;
    chips.push(f);
  }

  return chips.slice(0, 4);
}

function renderInline(text, keyPrefix) {
  const parts = [];
  // Combined regex: **bold** and number+unit highlights
  const regex =
    /\*\*(.+?)\*\*|(-?\d+(?:\.\d+)?)\s*(W|bpm|TSB|CTL|ATL|sRPE|min|km|kg|h)\b/g;
  let last = 0;
  let m;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    if (m[1] !== undefined) {
      // bold
      parts.push(
        <strong key={`${keyPrefix}-b${idx}`} style={{ color: C.text }}>
          {m[1]}
        </strong>
      );
    } else {
      // number+unit
      parts.push(
        <span
          key={`${keyPrefix}-n${idx}`}
          style={{ color: C.cyan, fontWeight: 600 }}
        >
          {m[0]}
        </span>
      );
    }
    last = m.index + m[0].length;
    idx++;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

function renderAssistantContent(text) {
  const lines = text.split('\n');
  const elements = [];
  lines.forEach((line, i) => {
    if (line === '') {
      elements.push(<div key={i} style={{ marginBottom: 6 }} />);
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <div key={i} style={{ paddingLeft: 16, marginBottom: 2 }}>
          {renderInline(line, `l${i}`)}
        </div>
      );
    } else {
      elements.push(<div key={i}>{renderInline(line, `l${i}`)}</div>);
    }
  });
  return elements;
}

function CoachAvatar() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: C.bg,
        border: `1px solid ${C.cyan}`,
        color: C.cyan,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'DM Mono', monospace",
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      C
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  if (isUser) {
    return (
      <div
        style={{
          alignSelf: 'flex-end',
          maxWidth: '80%',
          background: C.userBubble,
          border: `1px solid ${C.userBubbleBorder}`,
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
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignSelf: 'flex-start',
        maxWidth: '85%',
      }}
    >
      <CoachAvatar />
      <div
        style={{
          background: C.panel,
          borderLeft: `3px solid ${C.assistantBorder}`,
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: C.cyan,
            letterSpacing: 2,
            marginBottom: 6,
            opacity: 0.7,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          COACH
        </div>
        {renderAssistantContent(msg.content)}
      </div>
    </div>
  );
}

function tsbColour(tsb) {
  if (tsb > 5) return C.green;
  if (tsb >= -10) return C.amber;
  return C.err;
}

function readinessColour(score) {
  if (score >= 80) return C.green;
  if (score >= 60) return C.amber;
  return C.err;
}

function Chip({ label, colour }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "'DM Mono', monospace",
        padding: '2px 8px',
        borderRadius: 10,
        border: `1px solid ${colour}`,
        background: C.panel,
        color: colour,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function ContextStrip({ latestLoad, vitals, rosterMode }) {
  const chips = [];

  if (latestLoad) {
    const col = tsbColour(latestLoad.tsb);
    chips.push(
      <Chip
        key="tsb"
        label={`TSB ${latestLoad.tsb > 0 ? '+' : ''}${latestLoad.tsb}`}
        colour={col}
      />
    );
    chips.push(
      <Chip key="ctl" label={`CTL ${latestLoad.ctl}`} colour={C.muted} />
    );
    chips.push(
      <Chip key="atl" label={`ATL ${latestLoad.atl}`} colour={C.muted} />
    );
  }

  if (vitals.latest && vitals.readinessScore != null) {
    const col = readinessColour(vitals.readinessScore);
    chips.push(
      <Chip
        key="readiness"
        label={`Readiness ${vitals.readinessScore} ${vitals.readinessLabel}`}
        colour={col}
      />
    );
    if (vitals.latest.rhr != null) {
      chips.push(
        <Chip key="rhr" label={`RHR ${vitals.latest.rhr}`} colour={C.muted} />
      );
    }
    if (vitals.latest.hrv != null) {
      chips.push(
        <Chip key="hrv" label={`HRV ${vitals.latest.hrv}ms`} colour={C.muted} />
      );
    }
    if (vitals.latest.sleep != null) {
      chips.push(
        <Chip
          key="sleep"
          label={`Sleep ${vitals.latest.sleep}h`}
          colour={C.muted}
        />
      );
    }
  }

  chips.push(
    <Chip key="phase" label={PHASE_CONTEXT.current} colour={C.cyan} />
  );
  chips.push(
    <Chip
      key="roster"
      label={rosterMode === 'fifo' ? 'FIFO' : 'HOME'}
      colour={rosterMode === 'fifo' ? C.amber : C.green}
    />
  );

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
      }}
    >
      {chips}
    </div>
  );
}

function SessionBanner({ todayPlanned, onDiscuss, isStreaming }) {
  if (!todayPlanned) return null;
  const label = [todayPlanned.type, todayPlanned.label]
    .filter(Boolean)
    .join(' — ');
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: C.panel,
        borderLeft: `3px solid ${C.cyan}`,
        borderRadius: 6,
        padding: '8px 12px',
        marginBottom: 10,
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: C.cyan,
            fontFamily: "'DM Mono', monospace",
            marginBottom: 2,
            opacity: 0.8,
          }}
        >
          TODAY
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.text,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {label}
        </div>
      </div>
      <button
        onClick={onDiscuss}
        disabled={isStreaming}
        style={{
          background: 'transparent',
          border: `1px solid ${C.cyan}`,
          color: C.cyan,
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 10,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: 0.5,
          cursor: isStreaming ? 'not-allowed' : 'pointer',
          opacity: isStreaming ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        DISCUSS →
      </button>
    </div>
  );
}

export default function CoachView() {
  const {
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
  } = useCoach();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const tssData = tssQuery.data ?? [];
  const loadData = tssData.length ? calcTrainingLoad(tssData) : [];
  const latestLoad = loadData[loadData.length - 1] ?? null;
  const rosterMode = getRosterMode(new Date());

  // Auto-fire morning brief on first open of each day when chat is empty
  useEffect(() => {
    if (!messagesReady || isStreaming || messages.length > 0) return;
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem('coach_brief_date') === today) return;
    localStorage.setItem('coach_brief_date', today);
    sendMessage(
      'Give me a morning training brief. Cover: training status (TSB/CTL/ATL and what it means), ' +
        "today's readiness, what's on the schedule today, and one coaching focus for the session. Keep it tight."
    );
  }, [messagesReady, messages.length, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

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
          marginBottom: 8,
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

      {/* Context strip */}
      <ContextStrip
        latestLoad={latestLoad}
        vitals={vitals}
        rosterMode={rosterMode}
      />

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
        {/* Today's session banner — only in empty state */}
        {messages.length === 0 && !isStreaming && (
          <SessionBanner
            todayPlanned={todayPlanned}
            onDiscuss={() => sendMessage("Talk me through today's session")}
            isStreaming={isStreaming}
          />
        )}

        {messages.length === 0 && !isStreaming && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '16px 0',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 4,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: 1,
              }}
            >
              ASK YOUR COACH
            </div>
            {getChips(latestLoad, vitals, rosterMode, todayPlanned).map(
              (prompt) => (
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
              )
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streamingContent && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignSelf: 'flex-start',
              maxWidth: '85%',
            }}
          >
            <CoachAvatar />
            <div
              style={{
                background: C.panel,
                borderLeft: `3px solid ${C.assistantBorder}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: C.text,
                lineHeight: 1.6,
                wordBreak: 'break-word',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: C.cyan,
                  letterSpacing: 2,
                  marginBottom: 6,
                  opacity: 0.7,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                COACH
              </div>
              {renderAssistantContent(streamingContent)}
              <span style={{ opacity: 0.7 }}>▌</span>
            </div>
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
