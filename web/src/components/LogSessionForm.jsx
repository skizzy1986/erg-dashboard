import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { supabase } from '../supabaseClient.js';
import { THEME } from '../constants/theme.js';
import { toLogDate } from '../utils/dateFormat.js';
import { invalidateSessionQueries } from '../utils/invalidateSessionQueries.js';

// Kept as descriptors, not text, so a message already on screen follows a
// language switch.
const NOTICE = {
  saved: msg`Saved! Session added to your log.`,
  saveFailed: msg({
    message: 'Save failed: {detail}',
    comment: '{detail} is the server error message, shown as it came',
  }),
  needLabel: msg`Add a session label (e.g. Lower 2).`,
  needExercise: msg`Add at least one exercise.`,
};

export default function LogSessionForm({ onSaved }) {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const todayKey = toLogDate(new Date());
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayKey);
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState('');
  const [srpe, setSrpe] = useState(5);
  const [rows, setRows] = useState([
    { name: '', weight: '', volume: '', e1rm: '', pr: false },
  ]);
  const [notice, setNotice] = useState(null); // {type:'ok'|'err', text, values}

  const srpeAnchor =
    srpe <= 2
      ? t`very easy · full conversation`
      : srpe <= 4
        ? t`easy · talk in sentences (UT2)`
        : srpe <= 6
          ? t`moderate · short sentences (UT1)`
          : srpe <= 8
            ? t`hard · few words (threshold)`
            : t`max · can't talk`;
  const srpeColor =
    srpe <= 4
      ? THEME.positive
      : srpe <= 6
        ? THEME.caution
        : srpe <= 8
          ? THEME.warning
          : THEME.critical;

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
    setNotice(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const filledRows = rows.filter((r) => r.name.trim());
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
        // sessions.status is nullable with no default, and NULL is not in
        // COMPLETED_STATUSES — an omitted status meant the row rendered in the
        // log but counted for nothing: no TSS/CTL/ATL/TSB, and it could never
        // clear a benchmark. 'completed' rather than 'logged': that one is the
        // PM5 live-save path's marker.
        status: 'completed',
        label: label.trim(),
        duration: duration.trim() || null,
        srpe,
        prs,
        exercises,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSessionQueries(queryClient);
      setNotice({ type: 'ok', text: NOTICE.saved });
      reset();
      if (onSaved) onSaved();
    },
    onError: (error) => {
      setNotice({
        type: 'err',
        text: NOTICE.saveFailed,
        values: { detail: error.message },
      });
    },
  });
  const saving = saveMutation.isPending;

  const submit = () => {
    // Validate
    if (!label.trim()) {
      setNotice({ type: 'err', text: NOTICE.needLabel });
      return;
    }
    const filledRows = rows.filter((r) => r.name.trim());
    if (filledRows.length === 0) {
      setNotice({ type: 'err', text: NOTICE.needExercise });
      return;
    }

    setNotice(null);
    saveMutation.mutate();
  };

  const inp = {
    background: THEME.field,
    border: `1px solid ${THEME.border}`,
    borderRadius: 4,
    padding: '7px 9px',
    fontSize: 11,
    color: THEME.text,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 8,
    letterSpacing: 1,
    color: THEME.muted,
    marginBottom: 3,
    display: 'block',
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          background:
            'color-mix(in srgb, var(--color-positive) 8.24%, transparent)',
          border: `1px solid ${THEME.positive}`,
          borderRadius: 6,
          padding: '12px',
          marginBottom: 14,
          fontSize: 12,
          fontWeight: 700,
          color: THEME.positive,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 1,
        }}
      >
        <Trans comment="Button, all capitals">＋ LOG A STRENGTH SESSION</Trans>
      </button>
    );
  }

  return (
    <div
      style={{
        background: THEME.raised,
        border: `1px solid ${THEME.positive}`,
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
            color: THEME.positive,
            letterSpacing: 1,
          }}
        >
          <Trans comment="Form title, all capitals">LOG STRENGTH SESSION</Trans>
        </span>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.muted,
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
          <label style={lbl}>
            <Trans
              context="log-form-date"
              comment="Field label, all capitals. The date is stored month/day/year; in Spanish say so, e.g. FECHA (MES/DÍA/AÑO)"
            >
              DATE
            </Trans>
          </label>
          <input
            style={inp}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder={t({
              message: '6/19/26',
              comment:
                'Date field placeholder. The app stores month/day/year, so in Spanish write the format (mm/dd/aa) rather than a sample date a reader would take as day/month',
            })}
          />
        </div>
        <div>
          <label style={lbl}>
            <Trans comment="Field label, all capitals">DURATION</Trans>
          </label>
          <input
            style={inp}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1h4m"
          />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>
          <Trans comment="Field label, all capitals">SESSION LABEL</Trans>
        </label>
        <input
          style={inp}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t({
            message: 'Lower 2',
            comment: 'Example session name: the second lower-body session',
          })}
        />
      </div>

      {/* sRPE slider */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>
          <Trans comment="sRPE stays as is">sRPE — talk-test anchored</Trans>
        </label>
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
      <label style={lbl}>
        <Trans comment="Field label, all capitals">EXERCISES</Trans>
      </label>
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
              background: THEME.bg,
              borderRadius: 5,
              padding: '9px 10px',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                style={{ ...inp, flex: 1 }}
                value={r.name}
                onChange={(e) => setRow(i, 'name', e.target.value)}
                placeholder={t`Exercise name`}
              />
              <button
                onClick={() => removeRow(i)}
                style={{
                  background: 'none',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 4,
                  color: THEME.muted,
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
                placeholder={t({
                  message: 'Top wt (70kg)',
                  comment: 'Heaviest weight lifted, with an example',
                })}
              />
              <input
                style={inp}
                value={r.volume}
                onChange={(e) => setRow(i, 'volume', e.target.value)}
                placeholder={t({
                  message: 'Vol (2260kg)',
                  comment: 'Total volume lifted, with an example',
                })}
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
                color: THEME.caution,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={r.pr}
                onChange={(e) => setRow(i, 'pr', e.target.checked)}
                style={{ accentColor: THEME.caution }}
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
          border: `1px dashed ${THEME.border}`,
          borderRadius: 4,
          color: THEME.muted,
          cursor: 'pointer',
          padding: '7px',
          width: '100%',
          fontSize: 10,
          marginBottom: 14,
        }}
      >
        <Trans>＋ add exercise</Trans>
      </button>

      {/* Message + submit */}
      {notice && (
        <div
          style={{
            fontSize: 10,
            color: notice.type === 'ok' ? THEME.positive : THEME.critical,
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {i18n._(notice.text, notice.values)}
        </div>
      )}
      <button
        onClick={submit}
        disabled={saving}
        style={{
          width: '100%',
          background: saving ? THEME.border : THEME.positive,
          border: 'none',
          borderRadius: 6,
          padding: '12px',
          fontSize: 12,
          fontWeight: 700,
          color: THEME.surface,
          cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 1,
        }}
      >
        {saving
          ? t({ message: 'SAVING…', comment: 'Button, busy, all capitals' })
          : t({ message: 'SUBMIT SESSION', comment: 'Button, all capitals' })}
      </button>
    </div>
  );
}
