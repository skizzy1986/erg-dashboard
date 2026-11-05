"""Numeric comparison of a stage output with its committed cache, for when the bytes differ.

The stage caches reproduce byte for byte on the machine that generated them. On another CPU, OpenBLAS
and LAPACK pick different kernels, so float results differ in the last bits. compare() accepts that
drift within RTOL/ATOL, and fails on any structural difference: types, keys, lengths, shapes, dtypes,
or any integer value.
"""
import pickle
from pathlib import Path

import numpy as np

RTOL = 1e-7
ATOL = 1e-9


class _Max:
    def __init__(self):
        self.abs = 0.0
        self.rel = 0.0

    def floats(self, a, b, where):
        a = np.asarray(a, dtype=float); b = np.asarray(b, dtype=float)
        np.testing.assert_allclose(a, b, rtol=RTOL, atol=ATOL, err_msg=where)
        if a.size:
            d = np.abs(a - b)
            self.abs = max(self.abs, float(d.max()))
            with np.errstate(divide='ignore', invalid='ignore'):
                r = np.where(b != 0, d / np.abs(b), np.where(d == 0, 0.0, np.inf))
            self.rel = max(self.rel, float(r.max()))


def _is_int(x):
    return np.issubdtype(np.asarray(x).dtype, np.integer) or np.issubdtype(np.asarray(x).dtype, np.bool_)


def _array(a, b, where, m):
    assert a.shape == b.shape, f'{where}: shape {a.shape} != {b.shape}'
    assert a.dtype == b.dtype, f'{where}: dtype {a.dtype} != {b.dtype}'
    if _is_int(a):
        assert np.array_equal(a, b), f'{where}: integer values differ'
    else:
        m.floats(a, b, where)


def _walk(a, b, where, m):
    assert type(a) is type(b), f'{where}: type {type(a).__name__} != {type(b).__name__}'
    if isinstance(a, dict):
        assert list(a) == list(b), f'{where}: keys differ'
        for k in a:
            _walk(a[k], b[k], f'{where}[{k!r}]', m)
    elif isinstance(a, (list, tuple)):
        assert len(a) == len(b), f'{where}: length {len(a)} != {len(b)}'
        for i, (x, y) in enumerate(zip(a, b)):
            _walk(x, y, f'{where}[{i}]', m)
    elif isinstance(a, (np.ndarray, np.generic)):
        _array(np.asarray(a), np.asarray(b), where, m)
    elif isinstance(a, (bool, int, str, type(None))):
        assert a == b, f'{where}: {a!r} != {b!r}'
    elif isinstance(a, float):
        m.floats(a, b, where)
    else:
        raise AssertionError(f'{where}: cannot compare {type(a).__name__}')


def compare(produced: Path, committed: Path):
    """Return (max |diff|, max relative diff); raise AssertionError on any structural or out-of-tolerance difference."""
    produced, committed = Path(produced), Path(committed)
    m = _Max()
    suffix = committed.suffix
    if suffix == '.npy':
        _array(np.load(produced), np.load(committed), committed.name, m)
    elif suffix == '.npz':
        with np.load(produced) as a, np.load(committed) as b:
            assert a.files == b.files, f'{committed.name}: members {a.files} != {b.files}'
            for k in a.files:
                _array(a[k], b[k], f'{committed.name}:{k}', m)
    elif suffix == '.pkl':
        with open(produced, 'rb') as fa, open(committed, 'rb') as fb:
            _walk(pickle.load(fa), pickle.load(fb), committed.name, m)
    else:
        raise AssertionError(f'no comparison for {suffix} files')
    return m.abs, m.rel
