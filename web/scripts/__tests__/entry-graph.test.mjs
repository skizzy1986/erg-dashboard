import { entryFilesFrom, isCountedAsset } from '../entry-graph.mjs';

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
