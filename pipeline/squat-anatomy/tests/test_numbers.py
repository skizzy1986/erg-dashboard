"""AC4: shapes and the headline numbers the docs quote (δ at the bottom, rep summary)."""
import pickle

import numpy as np
import pytest

from squat.build import decode_html
from squat.stages._io import quiet


def test_delta_bottom_cache(paths):
    deltas = np.load(paths.v3 / 'deltas3.npy')
    assert np.degrees(deltas[-1]) == pytest.approx(4.1224, abs=0.01)


@pytest.mark.stl
def test_delta_bottom_fresh(ctx, paths, need_stl):
    from squat.stages import balance3
    need_stl()
    r = balance3.compute(ctx, np.load(paths.v3 / 'armik4_x.npy'), log=quiet)
    assert np.degrees(r.deltas[-1]) == pytest.approx(4.1224, abs=0.01)


@pytest.mark.stl
def test_rep_numbers(built):
    rep = decode_html(built.out)[0]['meta']['rep']
    assert {k: rep[k] for k in ('mcv', 'fpk', 'ecc', 'con', 'D', 'fmin')} == {
        'mcv': 0.61, 'fpk': 1.38, 'ecc': 1.63, 'con': 0.92, 'D': 0.563, 'fmin': 0.74}


def _arr(a, shape, dtype):
    assert a.shape == shape and a.dtype == np.dtype(dtype), (a.shape, a.dtype)


def test_shapes(paths):
    v3 = paths.v3
    _arr(np.load(v3 / 'deltas3.npy'), (41,), 'f8')
    _arr(np.load(v3 / 'frames3.npy'), (41, 11, 7), 'f8')
    _arr(np.load(v3 / 'hips3.npy'), (41, 3), 'f8')
    with open(v3 / 'rows3.pkl', 'rb') as fh:
        rows = pickle.load(fh)
    assert len(rows) == 41
    assert {frozenset(r) for r in rows} == {frozenset(
        ['i', 'S', 'delta', 'hip', 'knee', 'ankle', 'lumbar', 'depth', 'lean', 'bar', 'bx', 'cop',
         'Mhip', 'Mknee', 'Mank', 'Mlum', 'lord', 'klat', 'shin'])}
    with open(v3 / 'mlen3.pkl', 'rb') as fh:
        mlen = pickle.load(fh)
    assert len(mlen) == 43 and all(v.shape == (41,) for v in mlen.values())
    p = np.load(v3 / 'phase3.npz')
    assert p.files == ['t', 'v', 'h', 's', 'f', 'ph', 'fd', 'fa', 'vd', 'va', 'comy', 'i_bot', 'st0', 'st1']
    for k in ('t', 'v', 'h', 's', 'f'):
        _arr(p[k], (1842,), 'f8')
    _arr(p['ph'], (1842,), 'i8')
    for k in ('fd', 'fa', 'vd', 'va', 'comy'):
        _arr(p[k], (41,), 'f8')
    for k in ('i_bot', 'st0', 'st1'):
        _arr(p[k], (), 'i8')
    u = np.load(v3 / 'upper3.npz')
    assert u.files == ['P', 'S', 'SI', 'SM', 'STW', 'L']
    _arr(u['P'], (19597, 3), 'f8')
    _arr(u['S'], (20275, 3), 'f8')
    _arr(u['SI'], (39776, 3), 'i8')
    _arr(u['SM'], (20275,), 'u1')
    _arr(u['STW'], (20275,), 'u1')
    _arr(u['L'], (7759, 3), 'f8')
