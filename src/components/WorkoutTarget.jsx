import React, { useState } from "react";

const C = {
  panel: "#1a1a2e", border: "#4a4a68", accent: "#ffd700",
  text: "#e8e8f0", muted: "#7e7e9a",
};

export default function WorkoutTarget({ session }) {
  const [open, setOpen] = useState(false);

  if (!session) {
    return (
      <div style={{ padding: "8px 12px", fontSize: 10, color: C.muted, letterSpacing: 1 }}>
        NO PLANNED SESSION TODAY
      </div>
    );
  }

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "10px 14px",
          background: "none", border: "none", cursor: "pointer", color: C.text,
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: C.accent }}>TARGET</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{session.label}</span>
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${C.border}` }}>
          {session.duration && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
              <span style={{ color: C.text, fontWeight: 600 }}>{session.duration} min</span>
              {" · "}sRPE target: <span style={{ color: C.text }}>{session.srpe || "easy"}</span>
            </div>
          )}
          {session.notes && (
            <div style={{
              marginTop: 8, fontSize: 11, color: "#a0a0b8", lineHeight: 1.6,
              borderLeft: `2px solid ${C.accent}`, paddingLeft: 10,
            }}>
              {session.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
