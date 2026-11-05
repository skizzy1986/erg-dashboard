"""AC3: each CI stage, run from the committed caches, rewrites its outputs.

Byte for byte on the machine that generated the caches. Elsewhere, float results differ in the last bits
(BLAS/LAPACK kernels are chosen per CPU), so a sha mismatch falls back to tests/_compare.py, within
tolerance, and a warning records the drift.
"""
import hashlib
import warnings

import pytest
from _compare import compare

from squat.inputs import STL_BUILD, STL_UPPER
from squat.stages import STAGES
from squat.stages._io import quiet


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

# sha256sum of the committed pipeline/v3 caches. The stage must reproduce these exactly; if one moves,
# find the name lookup that changed rather than re-pinning (spec §8, RF8).
PINNED = {
    'deltas3.npy': '0df98840181c8d25363c4fbae7270b26d099681239efcab23f6c4c470e28e146',
    'frames3.npy': 'ba661c756e9567343259c06b15c498368cfe4945ba1e6ed15a9d3371aea0b52d',
    'hips3.npy': 'f5ddc20e76b18ff645abdc434788a46fce3beff53c203399dc0659459da2133a',
    'rows3.pkl': '334481b8cd101c722ced960d7301724cbd0fcffd44c2c2787a0855a3815748da',
    'mlen3.pkl': '3a7f28068085a933f6270d0c686bf15f87b4c297ade932ccb1860cf7522d365c',
    'phase3.npz': '3d34aea4ae1065d74b6544710d77e9256741e4ab01fcd9ab7794d1d786f608f2',
    'upper3.npz': 'a6a002821da68b9c29befa9749c7c5f35640e83152b3b02574707a3ce0549a68',
}

CASES = [
    pytest.param('balance3', marks=pytest.mark.stl),
    pytest.param('lengths3'),
    pytest.param('phase3', marks=pytest.mark.stl),
    pytest.param('upper3', marks=pytest.mark.stl),
]


@pytest.mark.parametrize('name', CASES)
def test_stage_bytes(name, ctx, paths, out_dir, need_stl, request):
    if request.node.get_closest_marker('stl'):
        need_stl(STL_BUILD + (STL_UPPER if name == 'upper3' else ()))
    before = {p.name: sha256(p) for p in paths.v3.iterdir() if p.is_file()}
    out = STAGES[name].fn(ctx, paths.v3, out_dir, log=quiet)
    assert set(out) == set(STAGES[name].outputs)
    for fname, p in out.items():
        assert PINNED[fname] == before[fname], f'committed {fname} no longer matches its pin'
        if sha256(p) != PINNED[fname]:
            d, r = compare(p, paths.v3 / fname)
            warnings.warn(f'{name}/{fname}: not bit-exact on this machine (max|diff| {d:.3e}, max rel {r:.3e}); '
                          'matched within tolerance')
    assert {p.name: sha256(p) for p in paths.v3.iterdir() if p.is_file()} == before, 'stage wrote into pipeline/v3'


CACHES = list(PINNED) + ['armik3_x.npy', 'armik4_x.npy']


@pytest.mark.parametrize('fname', CACHES)
def test_compare_self_is_zero(fname, paths):
    assert compare(paths.v3 / fname, paths.v3 / fname) == (0.0, 0.0)


def test_compare_rejects_perturbation(paths, tmp_path):
    import numpy as np
    a = np.load(paths.v3 / 'deltas3.npy').copy()
    a[7] += 1e-3
    np.save(tmp_path / 'deltas3.npy', a)
    with pytest.raises(AssertionError):
        compare(tmp_path / 'deltas3.npy', paths.v3 / 'deltas3.npy')


def test_compare_rejects_integer_change(paths, tmp_path):
    import numpy as np
    with np.load(paths.v3 / 'phase3.npz') as z:
        d = {k: z[k] for k in z.files}
    d['ph'] = d['ph'].copy(); d['ph'][100] += 1
    np.savez(tmp_path / 'phase3.npz', **d)
    with pytest.raises(AssertionError):
        compare(tmp_path / 'phase3.npz', paths.v3 / 'phase3.npz')


def test_compare_rejects_pickle_structure(paths, tmp_path):
    import pickle
    with open(paths.v3 / 'rows3.pkl', 'rb') as fh:
        rows = pickle.load(fh)
    del rows[3]['lord']
    with open(tmp_path / 'rows3.pkl', 'wb') as fh:
        pickle.dump(rows, fh, protocol=4)
    with pytest.raises(AssertionError):
        compare(tmp_path / 'rows3.pkl', paths.v3 / 'rows3.pkl')
