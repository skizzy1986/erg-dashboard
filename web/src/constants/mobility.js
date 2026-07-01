// Mobility / yoga — an integral training pillar (not accessory afterthought).
// Given the left hamstring/glute rehab, mobility is load-bearing for staying
// healthy enough to train. Three strands: soft-tissue (foam roll), pre-session
// drills (prime before erg/lift), and yoga flows (longer reset).
// MOBILITY_ROUTINES = the library on hand; mobilityLog (constants/logs.js) is
// the tracking that keeps consistency a visible pillar.

export const MOBILITY_ROUTINES = [
  {
    id: 'foam',
    name: 'Foam Roll / Soft Tissue',
    icon: '🧻',
    color: '#00d4ff',
    when: 'Post-session or evening. Anytime tissue feels tight.',
    why: 'Manages tissue quality + tightness around the rowing posture (thoracic, lats, hips) and the rehab area. Down-regulates after hard sessions.',
    blocks: [
      {
        move: 'Thoracic spine — 60-90s',
        visual:
          'Lie on your back, roller across your mid-back (under the shoulder blades). Hands behind head, elbows in. Lift hips slightly and roll from mid-back up toward the shoulders — pause and breathe on tight spots. Can gently arch back over the roller at a sticky segment.',
      },
      {
        move: 'Lats — 45s/side',
        visual:
          'Lie on one side, arm overhead, roller in the armpit/upper-ribs area. Roll the line from armpit down toward the lower ribs. Rotate slightly front-to-back to find the lat. This is the reach/finish muscle in the stroke.',
      },
      {
        move: 'Glutes / piriformis — 60s/side',
        rehab: true,
        visual:
          'Sit on the roller (or a ball for more pressure). Cross one ankle over the opposite knee (figure-4), lean slightly toward the crossed side. Roll the meat of the glute slowly. Ball into the deepest spot and breathe. Key rehab tissue — give the left side time.',
      },
      {
        move: 'Hamstrings — 60s/side',
        rehab: true,
        visual:
          "Sit with the roller under one thigh, hands behind for support, leg straight. Roll from just under the sit-bone (origin) down toward the back of the knee. Turn the foot in/out to hit different parts. Extra time and care on the left — back off if it's sharp near the origin (rehab area).",
      },
      {
        move: 'Quads / IT band — 45-60s/side',
        visual:
          'Face-down (plank-ish) with the roller under the front of one thigh. Roll hip-to-knee. Rotate slightly to the outer thigh (ITB) — that side is often tender, keep pressure tolerable.',
      },
      {
        move: 'Calves — 45s/side',
        visual:
          'Seated, roller under one calf, other leg crossed over for extra load. Hands lift the hips. Roll ankle-to-knee, rotate the foot in/out to cover inner/outer calf.',
      },
    ],
    note: 'Slow. Breathe into tight spots. NOT a pain contest — discomfort ok, sharp pain no. Extra care + time on the left hamstring/glute.',
  },
  {
    id: 'prep',
    name: 'Pre-Session Mobility / Prime',
    icon: '🔑',
    color: '#34d399',
    when: "Before EVERY erg + every lift (the 'mobility first' in session notes).",
    why: 'Primes the body to move well before loading it. Cheap insurance — opens hips/t-spine/shoulders so the catch and the squat have range. Protects the rehab area by warming it before load.',
    blocks: [
      {
        move: 'Cat-cow — 8-10 slow reps',
        visual:
          'On hands and knees (hands under shoulders, knees under hips). Inhale: drop the belly, lift the chest and tailbone (cow). Exhale: round the spine up, tuck the chin and tailbone (cat). Move slowly, segment by segment, led by the breath.',
      },
      {
        move: 'Hip 90/90 transitions — 5/side',
        visual:
          'Sit on the floor, both legs bent at 90°: front shin across in front of you, back shin out to the side. Keeping chest tall, rotate both knees over to the other side so the legs swap front/back. Flow side to side. Opens internal/external hip rotation for the catch.',
      },
      {
        move: "World's greatest stretch — 4/side",
        visual:
          'From a lunge (right foot forward), left hand on the floor inside the front foot. Drive the right elbow down toward the floor near the right foot, then rotate and reach that same arm up to the ceiling, opening the chest. Return and repeat. Full-body opener — hip, t-spine, hamstring.',
      },
      {
        move: 'Leg swings, front-back + lateral — 10/side',
        rehab: true,
        visual:
          'Hold a wall/rack for balance. Swing one leg forward and back like a pendulum, relaxed, increasing range gradually — keep the torso still. Then swing the same leg side-to-side across the body. Dynamic hamstring/glute prep — controlled, never forced (rehab warm-up).',
      },
      {
        move: 'Thoracic open-books — 6/side',
        visual:
          'Lie on your side, knees bent and stacked, arms extended together in front at shoulder height. Keeping knees down, sweep the top arm up and over to the other side, opening the chest toward the ceiling, follow with your eyes. Return. Restores rotation lost to the rowing posture.',
      },
      {
        move: 'Band shoulder pass-throughs — 10',
        visual:
          "Hold a band (or stick) wide in both hands in front of you. Keeping arms straight, raise it overhead and back behind you as far as comfortable, then return — a big arc. Widen your grip if it's tight. Opens the shoulders for the catch and overhead.",
      },
      {
        move: 'Glute bridges — 12',
        rehab: true,
        visual:
          "Lie on your back, knees bent, feet flat hip-width. Push through the heels and lift the hips until knees-hips-shoulders form a line — squeeze the glutes hard at the top, don't arch the low back. Lower slowly. Fires the glutes before squat/erg (rehab activation — don't skip).",
      },
    ],
    note: "5-8min, dynamic not static (save long holds for post). The glute bridges + leg swings double as rehab activation — don't skip them.",
  },
  {
    id: 'yoga',
    name: 'Yoga Flow',
    icon: '🧘',
    color: '#a78bfa',
    when: 'Recovery slots (Thu AM), rest days, evenings. The longer reset.',
    why: 'Longer holds for genuine range + a parasympathetic down-shift (recovery, sleep, HRV). Counters the flexion-dominant rowing posture with extension + rotation.',
    blocks: [
      {
        move: 'Down dog → forward fold — 1-2min',
        visual:
          'From hands and knees, tuck toes and lift hips up and back into an inverted-V (down dog) — heels reaching toward the floor, spine long, pedal the feet. Then walk hands back to the feet and hang into a forward fold, knees soft, head heavy. Settles the whole posterior chain.',
      },
      {
        move: 'Low lunge + half-split — 1min/side',
        rehab: true,
        visual:
          'Step into a low lunge (right foot forward, left knee down), sink the hips forward to stretch the back hip flexor. Then shift the hips back, straightening the front leg with toes up, folding gently over it (half-split) for the hamstring. Gentle on the left — physio-comfortable range only (rehab).',
      },
      {
        move: 'Pigeon — 1-2min/side',
        rehab: true,
        visual:
          'From down dog or hands-and-knees, bring the right shin forward and across, angled under your torso, left leg extended straight back. Square the hips and fold forward over the front shin, breathing into the deep glute. Ease into the left side slowly — no sharp stretch (rehab area).',
      },
      {
        move: 'Thread-the-needle — 1min/side',
        visual:
          'On hands and knees, slide the right arm underneath the body and across to the left, shoulder and temple coming toward the floor, palm up. Rest there and breathe into the upper-back rotation. Return and switch. T-spine release.',
      },
      {
        move: 'Cobra / sphinx — 1min',
        visual:
          'Lie face-down. Sphinx: prop on the forearms, elbows under shoulders, gently lifting the chest with a long low back. Cobra: hands by the ribs, press the chest higher, shoulders down away from the ears. Spinal extension — the direct antidote to rowing flexion.',
      },
      {
        move: 'Supine twist — 1min/side',
        visual:
          'Lie on your back, hug both knees in, then let them drop to one side while you extend the opposite arm out and turn the head away. Keep both shoulders grounded. Breathe into the low-back and hip rotation. Switch sides.',
      },
      {
        move: 'Legs-up-wall + breath — 3-5min',
        visual:
          'Sit side-on to a wall, then swing the legs up it as you lie back, hips close to or a few inches from the wall, arms relaxed. Just breathe slowly — long exhales. The down-regulation finish: shifts you into recovery (parasympathetic) mode.',
      },
    ],
    note: 'Breath-led, never force. Pigeon + half-split touch the rehab area — back off to physio-comfortable range, no sharp stretch. Great on poor-sleep days (the down-shift helps).',
  },
];

export const MOBILITY_STREAK_NOTE =
  "Consistency is the metric here, not intensity. The prep work especially — it's rehab activation disguised as a warm-up. Dropping it is the flag, not a quiet skip.";
