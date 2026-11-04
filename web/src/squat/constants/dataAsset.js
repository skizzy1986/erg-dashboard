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
    bytes: 99904,
    sha256: 'c2e7acdc6f6d8ffc687144ac90ab59c9b09bef917ccd639422e6f55ff1a1152a',
  },
};
