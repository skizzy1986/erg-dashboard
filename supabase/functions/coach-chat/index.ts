// coach-chat — streaming Anthropic API proxy for the fitness coach tab.
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  — Anthropic API key
//
// Deployed with JWT verification ON (default). The caller must send
// Authorization: Bearer <supabase-session-token>.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONTEXT_CHARS = 8000;

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

  let body: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    context?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'sonnet', context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // The training context is assembled client-side by buildTrainingContext in
  // web/src/hooks/useCoach.js and posted here. It used to be rebuilt in this
  // function, against column names that do not exist on vitals, a status
  // filter matching none of the rows, and an ISO-vs-"M/D/YY" date comparison
  // that could never be true — so it always collapsed to a bare header line
  // and the Coach ran blind (#199). The client already derives all of it with
  // tested code; this function no longer duplicates any of it.
  //
  // Capped rather than validated: this is the athlete's own authenticated
  // browser posting his own data back, so there is nothing to escalate — but
  // an unbounded string spliced into a system prompt still gets a bound.
  const trainingContext =
    typeof context === 'string'
      ? context.trim().slice(0, MAX_CONTEXT_CHARS)
      : '';

  const resolvedModel = MODEL_MAP[model] ?? MODEL_MAP.sonnet;
  // An older cached bundle posts no context. It still gets a working coach,
  // just an uninformed one.
  // No "CURRENT TRAINING DATA:" wrapper — buildTrainingContext already opens
  // with its own dated header, and prepending one duplicated it.
  const systemPrompt = trainingContext
    ? `${COACH_SYSTEM_PROMPT}\n\n${trainingContext}`
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
