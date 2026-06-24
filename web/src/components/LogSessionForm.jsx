import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function LogSessionForm({ onSaved }) {
  const today = new Date();
  const todayKey =
    today.getMonth() +
    1 +
    '/' +
    today.getDate() +
    '/' +
    String(today.getFullYear()).slice(-2);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayKey);
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState('');
  const [srpe, setSrpe] = useState(5);
  const [rows, setRows] = useState([
    { name: '', weight: '', volume: '', e1rm: '', pr: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}

  const srpeAnchor =
    srpe <= 2
      ? 'very easy · full conversation'
      : srpe <= 4
        ? 'easy · talk in sentences (UT2)'
        : srpe <= 6
          ? 'moderate · short sentences (UT1)'
          : srpe <= 8
            ? 'hard · few words (threshold)'
            : "max · can't talk";
  const srpeColor =
    srpe <= 4
      ? '#34d399'
      : srpe <= 6
        ? '#ffd700'
        : srpe <= 8
          ? '#ff6b35'
          : '#ff2d55';

  const setRow = (i, field, val) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, [field]: val } : r)));
  const addRow = () =>
    setRows([
      ...rows,
      { name: '', weight: '', volume: '', e1rm: '', pr: false },
    ]);
  const removeRow = (i) =>
    setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows);

  const reset = () => {
    setDate(todayKey);
    setLabel('');
    setDuration('');
    setSrpe(5);
    setRows([{ name: '', weight: '', volume: '', e1rm: '', pr: false }]);
    setMsg(null);
  };

  const submit = async () => {
    // Validate
    if (!label.trim()) {
      setMsg({ type: 'err', text: 'Add a session label (e.g. Lower 2).' });
      return;
    }
    const filledRows = rows.filter((r) => r.name.trim());
    if (filledRows.length === 0) {
      setMsg({ type: 'err', text: 'Add at least one exercise.' });
      return;
    }

    setSaving(true);
    setMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const prs = filledRows.filter((r) => r.pr).length;
    const exercises = filledRows.map((r) => ({
      name: r.name.trim(),
      weight: r.weight.trim() || '—',
      volume: r.volume.trim() || '—',
      e1rm: r.e1rm.trim() || '—',
      pr: r.pr,
    }));
    const { error } = await supabase.from('sessions').insert({
      date,
      type: 'Strength',
      label: label.trim(),
      duration: duration.trim() || null,
      srpe,
      prs,
      exercises,
      user_id: user?.id,
    });
    setSaving(false);
    if (error) {
      setMsg({ type: 'err', text: 'Save failed: ' + error.message });
      return;
    }
    setMsg({ type: 'ok', text: 'Saved! Session added to your log.' });
    reset();
    if (onSaved) onSaved(); // tell parent to re-fetch
  };

  const inp = {
    background: '#08080d',
    border: '1px solid #4a4a68',
    borderRadius: 4,
    padding: '7px 9px',
    fontSize: 11,
    color: '#e8e8f0',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 8,
    letterSpacing: 1,
    color: '#7e7e9a',
    marginBottom: 3,
    display: 'block',
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          background: '#34d39915',
          border: '1px solid #34d399',
          borderRadius: 6,
          padding: '12px',
          marginBottom: 14,
          fontSize: 12,
          fontWeight: 700,
          color: '#34d399',
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 1,
        }}
      >
        ＋ LOG A STRENGTH SESSION
      </button>
    );
  }

  return (
    <div
      style={{
        background: '#2a2a48',
        border: '1px solid #34d399',
        borderRadius: 6,
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#34d399',
            letterSpacing: 1,
          }}
        >
          LOG STRENGTH SESSION
        </span>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#7e7e9a',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Top fields */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div>
          <label style={lbl}>DATE</label>
          <input
            style={inp}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="6/19/26"
          />
        </div>
        <div>
          <label style={lbl}>DURATION</label>
          <input
            style={inp}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1h4m"
          />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>SESSION LABEL</label>
        <input
          style={inp}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Lower 2"
        />
      </div>

      {/* sRPE slider */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>sRPE — talk-test anchored</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min="1"
            max="10"
            value={srpe}
            onChange={(e) => setSrpe(Number(e.target.value))}
            style={{ flex: 1, accentColor: srpeColor }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: srpeColor,
              width: 24,
              textAlign: 'center',
            }}
          >
            {srpe}
          </span>
        </div>
        <div style={{ fontSize: 9, color: srpeColor, marginTop: 3 }}>
          {srpeAnchor}
        </div>
      </div>

      {/* Exercise rows */}
      <label style={lbl}>EXERCISES</label>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          marginBottom: 10,
        }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              background: '#08080d',
              borderRadius: 5,
              padding: '9px 10px',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                style={{ ...inp, flex: 1 }}
                value={r.name}
                onChange={(e) => setRow(i, 'name', e.target.value)}
                placeholder="Exercise name"
              />
              <button
                onClick={() => removeRow(i)}
                style={{
                  background: 'none',
                  border: '1px solid #4a4a68',
                  borderRadius: 4,
                  color: '#7e7e9a',
                  cursor: 'pointer',
                  padding: '0 9px',
                  fontSize: 12,
                }}
              >
                −
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <input
                style={inp}
                value={r.weight}
                onChange={(e) => setRow(i, 'weight', e.target.value)}
                placeholder="Top wt (70kg)"
              />
              <input
                style={inp}
                value={r.volume}
                onChange={(e) => setRow(i, 'volume', e.target.value)}
                placeholder="Vol (2260kg)"
              />
              <input
                style={inp}
                value={r.e1rm}
                onChange={(e) => setRow(i, 'e1rm', e.target.value)}
                placeholder="e1RM (88.8kg)"
              />
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                color: '#ffd700',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={r.pr}
                onChange={(e) => setRow(i, 'pr', e.target.checked)}
                style={{ accentColor: '#ffd700' }}
              />
              🏆 PR
            </label>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        style={{
          background: 'none',
          border: '1px dashed #4a4a68',
          borderRadius: 4,
          color: '#7e7e9a',
          cursor: 'pointer',
          padding: '7px',
          width: '100%',
          fontSize: 10,
          marginBottom: 14,
        }}
      >
        ＋ add exercise
      </button>

      {/* Message + submit */}
      {msg && (
        <div
          style={{
            fontSize: 10,
            color: msg.type === 'ok' ? '#34d399' : '#ff2d55',
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {msg.text}
        </div>
      )}
      <button
        onClick={submit}
        disabled={saving}
        style={{
          width: '100%',
          background: saving ? '#4a4a68' : '#34d399',
          border: 'none',
          borderRadius: 6,
          padding: '12px',
          fontSize: 12,
          fontWeight: 700,
          color: '#08080d',
          cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 1,
        }}
      >
        {saving ? 'SAVING…' : 'SUBMIT SESSION'}
      </button>
    </div>
  );
}
