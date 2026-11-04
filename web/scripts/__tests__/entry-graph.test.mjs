import {
  entryFilesFrom,
  isCountedAsset,
  reachableFiles,
  squatOnlyFiles,
} from '../entry-graph.mjs';

// A trimmed but structurally faithful copy of a real dist/.vite/manifest.json
// from this app after the #331 split: one HTML entry, a static shared chunk,
// and lazy route chunks that import back into the entry.
const MANIFEST = {
  'index.html': {
    file: 'assets/index-abc.js',
    isEntry: true,
    imports: ['_shared-def.js'],
    dynamicImports: ['src/App.jsx', 'src/views/mobile/MobileApp.jsx'],
    css: ['assets/index-ghi.css'],
    assets: ['assets/archivo-var-jkl.woff2'],
  },
  '_shared-def.js': {
    file: 'assets/shared-def.js',
  },
  'src/App.jsx': {
    file: 'assets/App-mno.js',
    isDynamicEntry: true,
    // The back-edge that makes an unguarded walk loop forever.
    imports: ['index.html'],
    dynamicImports: ['src/views/ProgramView.jsx'],
  },
  'src/views/mobile/MobileApp.jsx': {
    file: 'assets/MobileApp-pqr.js',
    isDynamicEntry: true,
    imports: ['index.html'],
  },
  'src/views/ProgramView.jsx': {
    file: 'assets/ProgramView-stu.js',
    isDynamicEntry: true,
    css: ['assets/ProgramView-vwx.css'],
  },
};

describe('entryFilesFrom', () => {
  // The whole point of the entry budget. If this walk followed dynamicImports
  // it would report the total as the entry, pass every build, and silently
  // make the gate meaningless again — the exact defect #331 set out to fix.
  it('excludes lazy chunks, and the CSS that only they pull in', () => {
    const files = entryFilesFrom(MANIFEST);

    expect(files).toContain('assets/index-abc.js');
    expect(files).toContain('assets/shared-def.js');
    expect(files).toContain('assets/index-ghi.css');

    expect(files).not.toContain('assets/App-mno.js');
    expect(files).not.toContain('assets/MobileApp-pqr.js');
    expect(files).not.toContain('assets/ProgramView-stu.js');
    expect(files).not.toContain('assets/ProgramView-vwx.css');
  });

  it('terminates despite a lazy chunk importing back into the entry', () => {
    // Not a hypothetical: every capacitor web chunk in this build does exactly
    // this. Without the `seen` guard the walk never returns.
    expect(entryFilesFrom(MANIFEST)).toHaveLength(3);
  });

  it('follows static imports transitively, not just one level', () => {
    const chained = {
      'index.html': { file: 'assets/a.js', isEntry: true, imports: ['b'] },
      b: { file: 'assets/b.js', imports: ['c'] },
      c: { file: 'assets/c.js', css: ['assets/c.css'] },
    };
    expect(entryFilesFrom(chained)).toEqual([
      'assets/a.js',
      'assets/b.js',
      'assets/c.js',
      'assets/c.css',
    ]);
  });

  it('counts every entry when a build emits more than one', () => {
    const twoEntries = {
      'index.html': { file: 'assets/a.js', isEntry: true },
      'admin.html': { file: 'assets/b.js', isEntry: true },
      unused: { file: 'assets/c.js' },
    };
    expect(entryFilesFrom(twoEntries)).toEqual(['assets/a.js', 'assets/b.js']);
  });

  // A manifest with no isEntry means the build changed shape under us. Reading
  // that as "the entry is 0 KB" would pass the budget while measuring nothing.
  it('throws rather than reporting an empty entry', () => {
    expect(() => entryFilesFrom({ a: { file: 'assets/a.js' } })).toThrow(
      /No isEntry/
    );
  });

  it('ignores fonts and images, which no byte budget here counts', () => {
    expect(isCountedAsset('index-abc.js')).toBe(true);
    expect(isCountedAsset('index-ghi.css')).toBe(true);
    expect(isCountedAsset('archivo-var-jkl.woff2')).toBe(false);
    expect(isCountedAsset('icon-192.png')).toBe(false);
  });
});

// The shape this app's manifest takes since /squat landed: main.jsx renders
// RouteRoot, which lazy-loads one product or the other. AuthGate statically
// pulls supabase; SquatApp pulls a shared tokens chunk and lists its worker
// and data files under `assets`.
const TWO_PRODUCTS = {
  'index.html': {
    file: 'assets/index-a.js',
    isEntry: true,
    dynamicImports: ['src/AuthGate.jsx', 'src/squat/SquatApp.jsx'],
    css: ['assets/index-a.css'],
  },
  'src/AuthGate.jsx': {
    file: 'assets/AuthGate-b.js',
    isDynamicEntry: true,
    imports: ['index.html', '_supabase-c.js', '_tokens-t.js'],
    dynamicImports: ['src/App.jsx'],
  },
  '_supabase-c.js': { file: 'assets/supabase-c.js' },
  '_tokens-t.js': { file: 'assets/tokens-t.js' },
  'src/App.jsx': {
    file: 'assets/App-d.js',
    isDynamicEntry: true,
    imports: ['index.html'],
  },
  'src/squat/SquatApp.jsx': {
    file: 'assets/SquatApp-e.js',
    isDynamicEntry: true,
    imports: ['index.html', '_tokens-t.js'],
    assets: [
      'assets/anatomyDecode.worker-f.js',
      'assets/squat-anatomy-g.bin',
      'assets/squat-manifest-h.json',
    ],
  },
};

describe('entryFilesFrom with bootKeys', () => {
  it('adds the boot chunk and its static graph to first paint', () => {
    expect(
      entryFilesFrom(TWO_PRODUCTS, { bootKeys: ['src/AuthGate.jsx'] })
    ).toEqual([
      'assets/index-a.js',
      'assets/index-a.css',
      'assets/AuthGate-b.js',
      'assets/supabase-c.js',
      'assets/tokens-t.js',
    ]);
  });

  it("does not follow a boot chunk's own dynamic imports", () => {
    const files = entryFilesFrom(TWO_PRODUCTS, {
      bootKeys: ['src/AuthGate.jsx'],
    });
    expect(files).not.toContain('assets/App-d.js');
    expect(files).not.toContain('assets/SquatApp-e.js');
  });

  it('gives /squat a first paint with no supabase in it', () => {
    const files = entryFilesFrom(TWO_PRODUCTS, {
      bootKeys: ['src/squat/SquatApp.jsx'],
    });
    expect(files).toContain('assets/SquatApp-e.js');
    expect(files).toContain('assets/tokens-t.js');
    expect(files).not.toContain('assets/supabase-c.js');
    expect(files).not.toContain('assets/AuthGate-b.js');
  });

  it('behaves exactly as before with no boot keys', () => {
    expect(entryFilesFrom(TWO_PRODUCTS)).toEqual([
      'assets/index-a.js',
      'assets/index-a.css',
    ]);
  });

  // A renamed AuthGate must fail loudly, not shrink the entry by its size.
  it('throws on a boot key the manifest does not have', () => {
    expect(() =>
      entryFilesFrom(TWO_PRODUCTS, { bootKeys: ['src/Gone.jsx'] })
    ).toThrow(/Boot key src\/Gone.jsx/);
  });
});

describe('squat-only classification', () => {
  it('walks static, dynamic and asset edges, stopping where told', () => {
    const all = reachableFiles(TWO_PRODUCTS, ['index.html']);
    expect(all.has('assets/App-d.js')).toBe(true);
    expect(all.has('assets/anatomyDecode.worker-f.js')).toBe(true);
    const dash = reachableFiles(TWO_PRODUCTS, ['index.html'], {
      stopAt: ['src/squat/SquatApp.jsx'],
    });
    expect(dash.has('assets/SquatApp-e.js')).toBe(false);
    expect(dash.has('assets/tokens-t.js')).toBe(true);
  });

  it('charges the tool only for what the dashboard cannot reach', () => {
    expect(
      squatOnlyFiles(TWO_PRODUCTS, 'src/squat/SquatApp.jsx').sort()
    ).toEqual(
      [
        'assets/SquatApp-e.js',
        'assets/anatomyDecode.worker-f.js',
        'assets/squat-anatomy-g.bin',
        'assets/squat-manifest-h.json',
      ].sort()
    );
  });

  it('throws when the squat root is missing', () => {
    expect(() => squatOnlyFiles(TWO_PRODUCTS, 'src/nope.jsx')).toThrow(
      /Squat root/
    );
  });

  it('terminates on cycles and tolerates dangling keys', () => {
    const cyclic = {
      'index.html': {
        file: 'assets/a.js',
        isEntry: true,
        imports: ['x', 'gone'],
      },
      x: { file: 'assets/x.js', dynamicImports: ['index.html'] },
    };
    expect([...reachableFiles(cyclic, ['index.html'])]).toEqual([
      'assets/a.js',
      'assets/x.js',
    ]);
  });
});
