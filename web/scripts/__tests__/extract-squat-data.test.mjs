import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { extractSquatData, sha256 } from '../extract-squat-data.mjs';

const PAYLOAD = Buffer.from('anatomy bytes '.repeat(40));
const GZ = gzipSync(PAYLOAD, { level: 9 });
const MANIFEST = { frames: { o: 0, n: 3, t: '<f4' }, meta: { bw: 85 } };

const fixture = ({ b64 = GZ.toString('base64'), man = MANIFEST } = {}) =>
  `<!doctype html><html><body>
<script id="squat-manifest" type="application/json">${JSON.stringify(man, null, 2)}</script>
<script id="squat-data" type="application/octet-stream">
${b64}
</script>
<script src="https://cdn.example/three.min.js"></script>
</body></html>`;

describe('extractSquatData', () => {
  it('returns the gzip bytes exactly as decoded, not re-encoded', () => {
    const { bin } = extractSquatData(fixture());
    expect(Buffer.compare(bin, GZ)).toBe(0);
    expect(gunzipSync(bin).equals(PAYLOAD)).toBe(true);
  });

  it('writes the manifest compactly with key order kept', () => {
    const { manifest } = extractSquatData(fixture());
    expect(manifest.toString('utf8')).toBe(JSON.stringify(MANIFEST));
  });

  it('is deterministic', () => {
    const a = extractSquatData(fixture());
    const b = extractSquatData(fixture());
    expect(sha256(a.bin)).toBe(sha256(b.bin));
    expect(sha256(a.manifest)).toBe(sha256(b.manifest));
  });

  it('refuses a page missing either tag, a non-gzip blob or junk', () => {
    expect(() => extractSquatData('<html></html>')).toThrow(/squat-manifest/);
    expect(() =>
      extractSquatData(fixture().replace('id="squat-data"', 'id="other"'))
    ).toThrow(/squat-data/);
    expect(() =>
      extractSquatData(
        fixture({ b64: Buffer.from('plain').toString('base64') })
      )
    ).toThrow(/gzip/);
    expect(() => extractSquatData(fixture({ b64: 'not base64!!' }))).toThrow(
      /not base64/
    );
    expect(() => extractSquatData(fixture({ man: { frames: {} } }))).toThrow(
      /no meta/
    );
  });

  it('writes both files and prints their hashes from the CLI', () => {
    const dir = mkdtempSync(join(tmpdir(), 'squat-extract-'));
    try {
      const input = join(dir, 'squat.html');
      writeFileSync(input, fixture());
      const script = resolve(process.cwd(), 'scripts/extract-squat-data.mjs');
      const out = execFileSync(process.execPath, [script, input, dir], {
        encoding: 'utf8',
      });
      const bin = readFileSync(join(dir, 'squat-anatomy.bin'));
      expect(Buffer.compare(bin, GZ)).toBe(0);
      expect(out).toContain(`sha256 ${sha256(bin)}`);
      expect(out).toContain(`${GZ.length} bytes`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
