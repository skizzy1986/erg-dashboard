// What the two data files must be, pinned at extraction time by
// scripts/extract-squat-data.mjs (see docs/squat/PROVENANCE.md). The byte
// length is the download's progress denominator when the host sends no
// Content-Length (it will not, for a compressed transfer); the sha256s let the
// content test prove the committed files are the ones extracted.
export const DATA_ASSET = {
  bin: {
    file: 'squat-anatomy.bin',
    bytes: 2202168,
    sha256: '92437fba2129bc54231aafcaacb462e9f95627f18ffce801c76e8b4b047fe3d1',
    // The decompressed buffer every manifest offset indexes into.
    rawBytes: 3450003,
  },
  manifest: {
    file: 'squat-manifest.json',
    // Re-pinned 2026-11-05 (PR2b-i): one `meta.muscles[].role` sentence was
    // edited to drop an EMG claim (docs/squat/PROVENANCE.md). `role` is prose
    // with no offset keys, so only this file changed — the bin entries above
    // are untouched and were NOT regenerated.
    bytes: 99892,
    sha256: '2ce630ff9973ae3a73d2bfe3e00e1ad313903f0f3aedc0a6134bfedca144f98e',
  },
};
