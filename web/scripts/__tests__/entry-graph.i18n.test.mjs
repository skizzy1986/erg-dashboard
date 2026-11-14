import {
  catalogTextLeaks,
  firstPaintLeaks,
  i18nCatalogProblems,
  precachedI18n,
} from '../entry-graph.mjs';
import { I18N_JS } from '../i18nChunks.mjs';

// The shape a real build has after i18n PR-1: main lazily loads AuthGate and
// SquatApp; AuthGate statically imports core Lingui and dynamically imports
// the Spanish catalog; SquatApp imports back into the shared entry.
const ES = 'src/locales/es.po';
const BUILD = {
  'index.html': {
    file: 'assets/index-a.js',
    isEntry: true,
    dynamicImports: ['src/AuthGate.jsx', 'src/squat/SquatApp.jsx'],
  },
  'src/AuthGate.jsx': {
    file: 'assets/AuthGate-b.js',
    isDynamicEntry: true,
    imports: ['index.html', '_dist-c.js'],
    dynamicImports: [ES],
  },
  '_dist-c.js': { file: 'assets/dist-c.js' },
  [ES]: { file: 'assets/i18n-es-d.js', isDynamicEntry: true },
  'src/squat/SquatApp.jsx': {
    file: 'assets/squat-SquatApp-e.js',
    isDynamicEntry: true,
    imports: ['index.html'],
  },
};
const BOOTS = ['src/AuthGate.jsx', 'src/squat/SquatApp.jsx'];
const SQUAT = 'src/squat/SquatApp.jsx';
const LABEL = {
  what: 'the Spanish dashboard catalog',
  fix: 'Use ensureLocale.',
};

describe('the Spanish dashboard catalog', () => {
  it('is on neither first paint when loaded dynamically', () => {
    expect(firstPaintLeaks(BUILD, ES, BOOTS, LABEL)).toEqual([]);
  });

  it('is reported, by name, when something imports it statically', () => {
    const leaky = {
      ...BUILD,
      'src/AuthGate.jsx': {
        ...BUILD['src/AuthGate.jsx'],
        imports: [...BUILD['src/AuthGate.jsx'].imports, ES],
        dynamicImports: [],
      },
    };
    expect(firstPaintLeaks(leaky, ES, BOOTS, LABEL)).toEqual([
      "The Spanish dashboard catalog is on src/AuthGate.jsx's first paint: i18n-es-d.js. Use ensureLocale.",
    ]);
  });

  it('is named i18n-* and unreachable from /squat', () => {
    expect(i18nCatalogProblems(BUILD, ES, SQUAT, I18N_JS)).toEqual([]);
  });

  it('fails when the naming rule missed the catalog', () => {
    const plain = { ...BUILD, [ES]: { ...BUILD[ES], file: 'assets/es-d.js' } };
    expect(i18nCatalogProblems(plain, ES, SQUAT, I18N_JS)[0]).toMatch(
      /did not build to i18n-\* JS only \(got: es-d\.js\)/
    );
  });

  it('fails when /squat can reach it without going through the entry', () => {
    const shared = {
      ...BUILD,
      [SQUAT]: { ...BUILD[SQUAT], dynamicImports: [ES] },
    };
    // Reachable from squat too, so it is no longer "only via" the catalog
    // root from the dashboard — but squat reaching it is the defect named.
    expect(i18nCatalogProblems(shared, ES, SQUAT, I18N_JS).join('\n')).toMatch(
      /\/squat can reach the dashboard catalog: i18n-es-d\.js/
    );
  });
});

describe('precachedI18n', () => {
  it('passes a precache with no translated catalog', () => {
    expect(precachedI18n(['index.html', 'assets/index-a.js'])).toEqual([]);
    expect(precachedI18n([])).toEqual([]);
  });

  it('names every precached catalog', () => {
    const [msg] = precachedI18n(['index.html', 'assets/i18n-es-a.js']);
    expect(msg).toMatch(/assets\/i18n-es-a\.js/);
  });

  it('does not mistake a look-alike for a catalog', () => {
    expect(precachedI18n(['icons/i18n-flag.png', 'assets/xi18n-a.js'])).toEqual(
      []
    );
  });
});

// i18n Phase 2a: a second Spanish catalog, loaded from the lazy shells.
const VIEWS_ES = 'src/locales/views/es.po';
const TWO = {
  ...BUILD,
  'src/AuthGate.jsx': {
    ...BUILD['src/AuthGate.jsx'],
    dynamicImports: [ES, 'src/App.jsx'],
  },
  'src/App.jsx': {
    file: 'assets/App-f.js',
    isDynamicEntry: true,
    imports: ['index.html', 'src/AuthGate.jsx'],
    dynamicImports: [VIEWS_ES],
  },
  [VIEWS_ES]: { file: 'assets/i18n-es-g.js', isDynamicEntry: true },
};

describe('both Spanish dashboard catalogs', () => {
  it('each is off both first paints, named i18n-*, and out of /squat', () => {
    for (const root of [ES, VIEWS_ES]) {
      expect(firstPaintLeaks(TWO, root, BOOTS, LABEL), root).toEqual([]);
      expect(i18nCatalogProblems(TWO, root, SQUAT, I18N_JS), root).toEqual([]);
    }
  });

  it('names the views catalog when it is imported statically by the shell', () => {
    const leaky = {
      ...TWO,
      'src/AuthGate.jsx': {
        ...TWO['src/AuthGate.jsx'],
        imports: [...TWO['src/AuthGate.jsx'].imports, VIEWS_ES],
      },
    };
    expect(firstPaintLeaks(leaky, VIEWS_ES, BOOTS, LABEL)[0]).toMatch(
      /on src\/AuthGate\.jsx's first paint: i18n-es-g\.js/
    );
  });

  it('precachedI18n names both chunks', () => {
    const [msg] = precachedI18n(['assets/i18n-es-d.js', 'assets/i18n-es-g.js']);
    expect(msg).toMatch(/i18n-es-d\.js, assets\/i18n-es-g\.js/);
  });
});

describe('catalogTextLeaks (the views English catalog)', () => {
  const PHRASES = [
    'No upcoming planned sessions.',
    'Nothing prescribed today.',
  ];
  const shell = {
    file: 'App-f.js',
    text: 'x("No upcoming planned sessions.")',
  };
  const entry = { file: 'AuthGate-b.js', text: 'y("Sign in to continue")' };

  it('passes when the words are only in a lazy chunk', () => {
    expect(
      catalogTextLeaks([entry], [entry, shell], PHRASES, 'Views English')
    ).toEqual([]);
  });

  it('names the first-paint file that carries them', () => {
    const leaked = {
      ...entry,
      text: `${entry.text}"Nothing prescribed today."`,
    };
    expect(
      catalogTextLeaks([leaked], [leaked, shell], PHRASES, 'Views English')
    ).toEqual([
      'Views English is on first paint: AuthGate-b.js. Import it only from the lazy shells (src/i18n/views.js).',
    ]);
  });

  it('reports itself blind when the words are nowhere in the build', () => {
    expect(
      catalogTextLeaks([entry], [entry], PHRASES, 'Views English')[0]
    ).toMatch(/not found in any built file/);
    expect(catalogTextLeaks([entry], [entry], [], 'Views English')).toEqual([
      'Views English: no phrases to look for.',
    ]);
  });
});
