import { allSpanish } from '../../../scripts/i18n-review-sheet.mjs';

// T-USTED. The Spanish is es-CO, neutral Latin American, and addresses the
// reader as tú — never usted. A word list cannot prove register, so a native
// reviewer still decides (docs/i18n/REVIEW-es-CO.md); this catches the slips a
// draft most often makes, across EVERY Spanish string the app can show: both
// catalogs and the pre-chunk table in src/i18n/lang.js.

// \b is ASCII-only, and an accented letter ends a "word" there, so these
// rules bound words with Unicode letter lookarounds instead.
const L = '\\p{L}';
const word = (body) => new RegExp(`(?<!${L})(?:${body})(?!${L})`, 'iu');

// Formal (usted) imperatives a UI is likely to use. Their tú forms end in -a/-e
// the other way round (conecta, inténtalo, vuelve), so the list is exact words.
const FORMAL_IMPERATIVES = [
  'Inicie',
  'Conecte',
  'Reconecte',
  'Desconecte',
  'Intente',
  'Inténtelo',
  'Vuelva',
  'Ingrese',
  'Introduzca',
  'Escriba',
  'Revise',
  'Compruebe',
  'Verifique',
  'Espere',
  'Confirme',
  'Apruebe',
  'Resuelva',
  'Sincronice',
  'Haga',
  'Hágalo',
  'Pulse',
  'Toque',
  'Presione',
  'Seleccione',
  'Elija',
  'Abra',
  'Cierre',
  'Use',
  'Utilice',
  'Mantenga',
  'Baje',
  'Suba',
  'Respire',
  'Empuje',
  'Recargue',
  'Actualice',
].join('|');

// A tú imperative of an -er/-ir verb with an attached pronoun ends -elo/-ela
// exactly as a formal -ar one does (vuélvelo, escríbelo against pruébelo), so
// those are named and let through. The tú reflexive takes -te, never -se.
const TU_ENCLITIC_ER_IR =
  'vuélvel|escríbel|léel|muével|ábrel|ciérrel|pídel|elígel|sígu?el|rómpel|pónel|cómel|bébel|sácudel|resuélvel|recógel';

const RULES = [
  ['usted / ustedes', word('ustede?s?')],
  ['vosotros register (Spain)', word('vosotr[oa]s|vuestr[oa]s?')],
  [
    'Spain-only vocabulary',
    // "vale la pena" (it is worth it) is neutral; "vale" as "OK" is Spain.
    word(
      'coger|cog[eií]\\p{L}*|ordenador(?:es)?|m[oó]vil(?:es)?|zumos?|vale(?!\\s+la\\s+pena)'
    ),
  ],
  // At the start of a sentence or clause, where an instruction begins: after
  // end punctuation, a comma or semicolon, or a joining y / e / o.
  [
    'formal imperative',
    new RegExp(
      `(?:^|[.!?¿¡:;,]\\s*|(?<!${L})[yeo]\\s+)(?:${FORMAL_IMPERATIVES})(?!${L})`,
      'iu'
    ),
  ],
  // An accented imperative with an attached pronoun: conéctese, inténtelo,
  // muévase, pregúntele. Unaccented words are skipped (base, clase, ese).
  [
    'formal imperative with pronoun',
    new RegExp(
      `(?<!${L})(?!(?:${TU_ENCLITIC_ER_IR}))${L}*[áéíóú]${L}*(?:[ae]se|el[oae]s?)(?!${L})`,
      'iu'
    ),
  ],
  // "su(s)" addressing the reader: body parts for the squat copy (PR-2/3), and
  // the account and device words the dashboard uses.
  [
    'formal possessive',
    word(
      'sus?\\s+(?:cuerpo|pierna|piernas|rodilla|rodillas|cadera|caderas|espalda|pie|pies|brazo|brazos|tronco|core|gl[uú]teos?|cuenta|correo|contrase[ñn]a|conexi[oó]n|historial|registro|sesi[oó]n|actividades|entrenamiento|dispositivos?|app|aplicaci[oó]n|p[aá]gina)'
    ),
  ],
];

const strings = allSpanish();

describe('Spanish register (T-USTED)', () => {
  it('has strings to check', () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it.each(RULES)('no %s', (_name, pattern) => {
    const hits = strings
      .filter((s) => pattern.test(s.es))
      .map((s) => `${s.id}: ${s.es}`);
    expect(hits).toEqual([]);
  });

  // The guard itself: each rule must catch a known-bad line, or a typo in a
  // pattern would pass everything forever.
  it.each([
    ['usted / ustedes', '¿Ustedes ya se conectaron?'],
    ['vosotros register (Spain)', 'Vuestro registro está listo.'],
    ['Spain-only vocabulary', 'Abre la app en tu móvil.'],
    ['Spain-only vocabulary', 'Vale, ya está.'],
    ['formal imperative', 'Algo falló. Inténtelo de nuevo.'],
    ['formal imperative', 'Revisa la red y vuelva a cargar.'],
    ['formal imperative', 'Sin conexión, recargue la página.'],
    ['formal imperative', 'Guardado; espere un momento.'],
    ['formal imperative with pronoun', 'Conéctese a internet.'],
    ['formal imperative with pronoun', 'Si falla, pruébelo otra vez.'],
    ['formal imperative with pronoun', 'Muévase despacio.'],
    ['formal imperative with pronoun', 'Pregúntele a tu entrenador.'],
    ['formal possessive', 'Revisa su contraseña.'],
    ['formal possessive', 'Abre la app en su dispositivo.'],
    ['formal possessive', 'Recarga su página.'],
    ['formal possessive', 'Actualiza su app.'],
  ])('the %s rule catches a bad line: %s', (name, bad) => {
    const [, pattern] = RULES.find(([n]) => n === name);
    expect(pattern.test(bad)).toBe(true);
  });

  // The line a review found passing the older, sentence-start-only rule. It
  // must now fail three ways.
  it('catches every usted slip in "Conéctese y vuelva a cargar la página en su dispositivo."', () => {
    const bad = 'Conéctese y vuelva a cargar la página en su dispositivo.';
    const caught = RULES.filter(([, p]) => p.test(bad)).map(([n]) => n);
    expect(caught).toEqual([
      'formal imperative',
      'formal imperative with pronoun',
      'formal possessive',
    ]);
  });

  it('the tú forms in use pass every rule', () => {
    for (const good of [
      'Inicia sesión para continuar',
      'Inténtalo de nuevo.',
      'INTÉNTALO DE NUEVO',
      'Revisa tu conexión e inténtalo de nuevo.',
      'Vuelve a conectar y aprueba el acceso a las actividades.',
      'Conéctate y vuelve a cargar.',
      'Ya reportamos el error. Inténtalo de nuevo y, si sigue pasando, vuelve a cargar la app.',
      'Toca cualquier sesión para ampliarla.',
      'Vuélvelo a intentar y escríbelo de nuevo.',
      'Vale la pena calentar antes.',
      'La sesión se sincronizó automáticamente.',
      'Ese es tu límite de hoy.',
      'Strava conectó su servidor con el tuyo.',
    ]) {
      for (const [name, pattern] of RULES) {
        expect(pattern.test(good), `${name}: ${good}`).toBe(false);
      }
    }
  });
});

describe('Spanish numbers', () => {
  it('never uses a decimal comma', () => {
    expect(strings.filter((s) => /\d,\d/.test(s.es))).toEqual([]);
  });

  it('keeps every placeholder of the English', () => {
    const holes = (s) => (s.match(/\{[A-Za-z0-9_]+\}/g) ?? []).sort();
    for (const s of strings) {
      expect(holes(s.es), s.id).toEqual(holes(s.en));
    }
  });
});
