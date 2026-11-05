"""AC3: each CI stage, run from the committed caches, rewrites its outputs byte for byte."""
import hashlib

import pytest

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
        assert sha256(p) == PINNED[fname], f'{name} wrote a different {fname}'
        assert PINNED[fname] == before[fname], f'committed {fname} no longer matches its pin'
    assert {p.name: sha256(p) for p in paths.v3.iterdir() if p.is_file()} == before, 'stage wrote into pipeline/v3'
