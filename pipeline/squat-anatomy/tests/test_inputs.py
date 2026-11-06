"""AC9: every input nothing here can regenerate is pinned, and a missing one fails with one clear line."""
import hashlib
import os
import subprocess
import sys

import pytest

from squat.inputs import FIXED_INPUTS, STL_SHA256
from squat.model.stl import StlCache
from squat.paths import MissingInputError, Paths


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize('rel', list(FIXED_INPUTS))
def test_fixed_input_sha(rel, paths):
    assert sha256(paths.data / rel) == FIXED_INPUTS[rel]


@pytest.mark.stl
def test_stl_sha(paths, need_stl):
    need_stl(tuple(STL_SHA256))
    assert {fid: sha256(paths.stl / f'{fid}.stl') for fid in STL_SHA256} == STL_SHA256


def test_missing_fixed_input_cli(paths, tmp_path):
    root = tmp_path / 'root'
    (root / 'v3').mkdir(parents=True)
    for p in paths.v3.iterdir():
        if p.is_file() and p.name != 'curve_alpha.npy':
            (root / 'v3' / p.name).symlink_to(p)
    (root / 'T_global.npy').symlink_to(paths.data / 'T_global.npy')
    env = {**os.environ, 'SQUAT_ROOT': str(root), 'PYTHONPATH': str(paths.project)}
    r = subprocess.run([sys.executable, '-m', 'squat', 'stage', 'lengths3', '--out-dir', str(tmp_path / 'out')],
                       cwd=tmp_path, env=env, capture_output=True, text=True)
    assert r.returncode == 3, r.stderr
    assert 'curve_alpha.npy' in r.stderr and 'fixed input' in r.stderr
    assert 'Traceback' not in r.stderr
    assert len(r.stderr.strip().splitlines()) == 1
    assert not (tmp_path / 'out' / 'mlen3.pkl').exists()


def test_missing_stl_message(tmp_path):
    cache = StlCache(Paths(data=tmp_path))
    with pytest.raises(MissingInputError) as e:
        cache.vertices('FMA23130')
    assert e.value.kind == 'stl'
    assert 'FMA23130.stl' in str(e.value) and 'scripts/fetch_stl.sh' in str(e.value)


def test_fetch_script_matches_inputs(paths):
    import re
    from squat.inputs import BP3D_COMMIT, STL_BUILD, STL_UPPER
    sh = (paths.project / 'scripts' / 'fetch_stl.sh').read_text(encoding='utf-8')
    assert re.search(r'^BP3D_COMMIT=(\w+)$', sh, re.M).group(1) == BP3D_COMMIT
    ids = re.search(r'IDS=\(([^)]*)\)$', sh, re.M).group(1).split()
    assert sorted(ids) == sorted(STL_BUILD + STL_UPPER) == sorted(STL_SHA256)
