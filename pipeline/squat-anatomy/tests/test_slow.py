"""AC10: the IK solves and the bone re-registration, deselected by default (python -m pytest -m slow)."""
import hashlib

import numpy as np
import pytest

from squat.stages import ik3, ik4, regcur
from squat.stages._io import quiet

pytestmark = [pytest.mark.slow, pytest.mark.stl]


def _same_x(out, committed):
    """Bit-exact on the same BLAS; L-BFGS-B over a different BLAS may differ in the last bits, so fall back to allclose."""
    a, b = np.load(out), np.load(committed)
    if hashlib.sha256(out.read_bytes()).digest() != hashlib.sha256(committed.read_bytes()).digest():
        np.testing.assert_allclose(a, b, atol=1e-6, rtol=0)


def test_ik3(ctx, paths, out_dir, need_stl):
    need_stl()
    out = ik3.run(ctx, paths.v3, out_dir, log=quiet)
    _same_x(out['armik3_x.npy'], paths.v3 / 'armik3_x.npy')


def test_ik4(ctx, paths, out_dir, need_stl):
    need_stl()
    out = ik4.run(ctx, paths.v3, out_dir, log=quiet)
    _same_x(out['armik4_x.npy'], paths.v3 / 'armik4_x.npy')


def test_regcur(ctx, paths, out_dir):
    if not (paths.data / 'T_arm_all.npy').is_file():
        pytest.skip('pipeline/T_arm_all.npy is not in git; take it from the preserve bundle (ARCHIVE.md)')
    out = regcur.run(ctx, paths.v3, out_dir, log=quiet)
    np.testing.assert_allclose(np.load(out['Tcur.npy']), np.load(paths.v3 / 'Tcur.npy'), atol=1e-6, rtol=0)
