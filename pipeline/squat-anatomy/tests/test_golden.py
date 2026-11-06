"""AC2: the build reproduces the data /squat ships, byte for byte."""
import hashlib
import json

import numpy as np
import pytest

from squat import repack
from squat.build import build, decode_html
from squat.cli import GOLDEN_RAW_BYTES, GOLDEN_RAW_SHA256
from squat.page import assemble_template

MOVE_TOGETHER = ('Data changed. A data-changing PR must move together: this golden sha, '
                 'web/src/squat/constants/dataAsset.js, poseModel.test.js pins, re-extraction '
                 '(web/scripts/extract-squat-data.mjs) + docs/squat/PROVENANCE.md, and tests/test_numbers.py.')

pytestmark = pytest.mark.stl


def test_build_golden(built, paths):
    man, raw = decode_html(built.out)
    assert len(raw) == GOLDEN_RAW_BYTES, MOVE_TOGETHER
    assert hashlib.sha256(raw).hexdigest() == GOLDEN_RAW_SHA256, MOVE_TOGETHER
    assert (built.raw_bytes, built.raw_sha256) == (GOLDEN_RAW_BYTES, GOLDEN_RAW_SHA256)
    assert man == json.loads(paths.shipped_manifest.read_text(encoding='utf-8')), MOVE_TOGETHER


def test_build_deterministic(built, ctx, paths, tmp_path):
    again = build(ctx, paths.v3, assemble_template(paths.page), tmp_path / 'again.html', log=lambda *a, **k: None)
    assert again.out.read_bytes() == built.out.read_bytes()


def test_base_not_mutated(built, ctx, paths):
    _, man, arr = repack.load(paths.v3 / 'base.html')
    assert ctx.base.man == man
    assert ctx.base.arr.keys() == arr.keys()
    for k in arr:
        assert np.array_equal(ctx.base.arr[k], arr[k]), k
