"""AC10: the IK solves and the bone re-registration, deselected by default (python -m pytest -m slow)."""
import hashlib
import warnings

import numpy as np
import pytest
from _compare import compare

from squat.geom import BONE_FID
from squat.stages import ik3, ik4, regcur
from squat.stages._io import quiet

pytestmark = [pytest.mark.slow, pytest.mark.stl]


def _same_x(name, out, committed):
    """Bit-exact on the same BLAS. L-BFGS-B over a different BLAS may differ in the last bits, so fall back to
    the shared numeric comparison and say so: a silent fallback would make a pass unable to tell the two apart."""
    if hashlib.sha256(out.read_bytes()).digest() != hashlib.sha256(committed.read_bytes()).digest():
        d, r = compare(out, committed)
        warnings.warn(f'{name}/{committed.name}: not bit-exact on this machine (max|diff| {d:.3e}, max rel {r:.3e}); '
                      'matched within tolerance')


def test_ik3(ctx, paths, out_dir, need_stl):
    need_stl()
    out = ik3.run(ctx, paths.v3, out_dir, log=quiet)
    _same_x('ik3', out['armik3_x.npy'], paths.v3 / 'armik3_x.npy')


def test_ik4(ctx, paths, out_dir, need_stl):
    need_stl()
    out = ik4.run(ctx, paths.v3, out_dir, log=quiet)
    _same_x('ik4', out['armik4_x.npy'], paths.v3 / 'armik4_x.npy')


def test_regcur(ctx, paths, out_dir, need_stl):
    if not (paths.data / 'T_arm_all.npy').is_file():
        pytest.skip('pipeline/T_arm_all.npy is not in git; take it from the preserve bundle (ARCHIVE.md)')
    need_stl(tuple(BONE_FID.values()))
    out = regcur.run(ctx, paths.v3, out_dir, log=quiet)
    np.testing.assert_allclose(np.load(out['Tcur.npy']), np.load(paths.v3 / 'Tcur.npy'), atol=1e-6, rtol=0)
