// coach-chat — streaming Anthropic API proxy for the fitness coach tab.
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  — Anthropic API key
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase.
//
// Deployed with JWT verification ON (default). The caller must send
// Authorization: Bearer <supabase-session-token>.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

const COACH_SYSTEM_PROMPT = `You are Scott's personal rowing and strength coach. Scott is a 50+ recreational athlete in Perth, WA.

ATHLETE PROFILE
- Sport: indoor rowing (erg), strength, cycling
- Season goal: compete at a rowing regatta, working toward Worlds Feb 2027
- Current phase: Base (Jun–Aug 2026) — aerobic foundation only
- Intensity rules: UT2 (<119bpm) and UT1 (119–136bpm) ONLY until Build 1 (Sep 2026). No threshold or VO2max intervals yet.
- CP estimate: ~190W (untested; CP test scheduled 1 Jul 2026)
- HR ceiling: 170bpm (MHR for training)
- Drag factor: 125 standard
- Polarised TID: 80% easy (Z2), 20% hard — but hard sessions deferred to Build 1

STRENGTH
- Compound-first: Back Squat, RDL, Bench Press, Barbell Row
- Progressive overload weekly; concurrent aerobic+strength
- Lower strength on Wed (two-a-day); Upper on separate days

NUTRITION
- TDEE ~3,140 kcal | protein floor 188g | fasted erg for Z2 base fat adaptation

RESPONSE STYLE
- Brief, direct, evidence-based. No filler phrases.
- Use numbers: quote watts, HR, sRPE, TSB where relevant.
- Numbered lists for multi-point answers.
- If you're uncertain, say so — don't fabricate.
- Stay within current phase. Don't prescribe intensity workouts until Build 1.`;

async function buildContext(jwt: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  // Decode already-validated JWT to extract user ID (Supabase verified it before this runs)
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  const userId = payload.sub as string;

  // Service role client bypasses RLS; we filter by userId explicitly
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const [{ data: tssRows }, { data: sessionRows }, { data: vitalsRows }] = await Promise.all([
    supabase
      .from('sessions')
      .select('date, duration, srpe')
      .eq('user_id', userId)
      .eq('status', 'logged')
      .gt('srpe', 0)
      .gt('duration', 0)
      .order('date', { ascending: true }),
    supabase
      .from('sessions')
      .select('date, type, label, duration, srpe, status')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10),
    supabase
      .from('vitals')
      .select('date, rhr, hrv, sleep')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30),
  ]);

  const lines = [`CURRENT TRAINING DATA (as of ${today}):`];

  // CTL / ATL / TSB via impulse-response model (mirrors trainingLoad.js)
  if (tssRows && tssRows.length > 0) {
    const CTL_K = Math.exp(-1 / 42);
    const ATL_K = Math.exp(-1 / 7);
    const tssMap: Record<string, number> = {};
    for (const r of tssRows) {
      tssMap[r.date] = Math.round((r.duration * r.srpe) / 60);
    }
    const startDate = new Date(tssRows[0].date);
    const endDate = new Date(today);
    let ctl = 0, atl = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const tss = tssMap[key] ?? 0;
      ctl = ctl * CTL_K + tss * (1 - CTL_K);
      atl = atl * ATL_K + tss * (1 - ATL_K);
    }
    const finalCtl = Math.round(ctl * 10) / 10;
    const finalAtl = Math.round(atl * 10) / 10;
    const tsb = Math.round((ctl - atl) * 10) / 10;
    const tsbSignal = tsb > 5 ? 'GREEN' : tsb > -10 ? 'AMBER' : 'RED';
    lines.push(`TSB: ${tsb} (${tsbSignal}) | CTL: ${finalCtl} | ATL: ${finalAtl}`);
  }

  // Readiness from vitals (mirrors computeReadiness in recoveryAnalytics.js)
  if (vitalsRows && vitalsRows.length > 0) {
    const latest = vitalsRows[0];
    const rhrVals = vitalsRows.filter((r) => r.rhr != null).map((r) => Number(r.rhr));
    const hrvVals = vitalsRows.filter((r) => r.hrv != null).map((r) => Number(r.hrv));
    const rhrBaseline = rhrVals.length >= 14 ? rhrVals.reduce((s, v) => s + v, 0) / rhrVals.length : 57;
    const hrvBaseline = hrvVals.length >= 14 ? hrvVals.reduce((s, v) => s + v, 0) / hrvVals.length : 30;
    let score = 100;
    if (latest.rhr != null) score -= Math.max(0, latest.rhr - rhrBaseline) * 4;
    if (latest.hrv != null) score -= Math.max(0, hrvBaseline - latest.hrv) * 1.5;
    if (latest.sleep != null) score -= latest.sleep < 7 ? (7 - latest.sleep) * 8 : 0;
    const readinessScore = Math.round(Math.min(100, Math.max(0, score)));
    const readinessLabel = readinessScore >= 80 ? 'READY' : readinessScore >= 60 ? 'CAUTION' : 'FATIGUED';
    const rhr = latest.rhr ?? '—';
    const hrv = latest.hrv ?? '—';
    const sleep = latest.sleep ?? '—';
    lines.push(`Readiness: ${readinessScore}/100 ${readinessLabel} | RHR: ${rhr} | HRV: ${hrv}ms | Sleep: ${sleep}h`);
  }

  // Today's planned session + recent logged sessions
  if (sessionRows && sessionRows.length > 0) {
    const todayPlanned = sessionRows.find((s) => s.status === 'planned' && s.date === today);
    if (todayPlanned) {
      const label = todayPlanned.label ? ` — ${todayPlanned.label}` : '';
      lines.push(`Today's session: ${todayPlanned.type}${label}`);
    }
    const recentLogged = sessionRows.filter((s) => s.status === 'logged').slice(0, 5);
    if (recentLogged.length > 0) {
      lines.push('Recent sessions (newest first):');
      for (const s of recentLogged) {
        const dur = s.duration ? ` ${s.duration}min` : '';
        const rpe = s.srpe ? ` sRPE ${s.srpe}` : '';
        lines.push(`  ${s.date}: ${s.type}${dur}${rpe}`);
      }
    }
  }

  return lines.join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { messages: Array<{ role: string; content: string }>; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'sonnet' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Extract JWT from Authorization header (already validated by Supabase before this runs)
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');

  // Build training context using service role key + explicit user_id filter
  const context = await buildContext(jwt);

  const resolvedModel = MODEL_MAP[model] ?? MODEL_MAP.sonnet;
  const systemPrompt = context
    ? `${COACH_SYSTEM_PROMPT}\n\nCURRENT TRAINING DATA:\n${context}`
    : COACH_SYSTEM_PROMPT;

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: resolvedModel,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return new Response(errorText, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(upstream.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    status: 200,
  });
});
