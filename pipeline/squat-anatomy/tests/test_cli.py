import os
import shutil
import subprocess
import sys

import pytest

from squat.cli import main
from squat.stages import STAGES


def test_list(capsys):
    assert main(['list']) == 0
    out = capsys.readouterr().out
    rows = {line.split()[0]: line.split() for line in out.splitlines() if line.split() and line.split()[0] in STAGES}
    assert set(rows) == set(STAGES)
    for name, s in STAGES.items():
        assert s.runtime_s in rows[name]
        assert rows[name][-1] == ('yes' if s.ci else 'no')
    assert {n for n, r in rows.items() if r[-1] == 'no'} == {'ik3', 'ik4', 'regcur'}
    assert 'v3/base.html' in out


def test_unknown_stage_is_usage_error():
    with pytest.raises(SystemExit) as e:
        main(['stage', 'nope'])
    assert e.value.code == 2


def test_verify_rejects_non_page(tmp_path, capsys):
    p = tmp_path / 'x.html'
    p.write_text('<html></html>', encoding='utf-8')
    assert main(['verify', str(p)]) == 1
    assert 'not a built squat page' in capsys.readouterr().err


# ---- subprocess tests: the real entry point, an isolated SQUAT_ROOT, cwd outside the project

def _root(paths, tmp_path, with_stl=False):
    root = tmp_path / 'root'
    (root / 'v3').mkdir(parents=True)
    (root / 'ext' / 'stl').mkdir(parents=True)
    for p in paths.v3.iterdir():
        if p.is_file():
            (root / 'v3' / p.name).symlink_to(p)
    (root / 'T_global.npy').symlink_to(paths.data / 'T_global.npy')
    if with_stl:
        for p in paths.stl.glob('*.stl'):
            (root / 'ext' / 'stl' / p.name).symlink_to(p)
    return root


def _squat(paths, root, cwd, *args):
    env = {**os.environ, 'SQUAT_ROOT': str(root), 'PYTHONPATH': str(paths.project)}
    return subprocess.run([sys.executable, '-m', 'squat', *args], cwd=cwd, env=env, capture_output=True, text=True)


def _one_line_error(r, code):
    assert r.returncode == code, (r.returncode, r.stderr)
    assert 'Traceback' not in r.stderr
    assert len(r.stderr.strip().splitlines()) == 1, r.stderr


def test_missing_stl_cli(paths, tmp_path):
    root = _root(paths, tmp_path)
    r = _squat(paths, root, tmp_path, 'stage', 'balance3', '--out-dir', str(tmp_path / 'out'))
    _one_line_error(r, 4)
    assert 'FMA23130.stl' in r.stderr and 'scripts/fetch_stl.sh' in r.stderr
    assert not (tmp_path / 'out').exists() or not any((tmp_path / 'out').iterdir())


def test_verify_missing_html_is_missing_input(paths, tmp_path):
    r = _squat(paths, _root(paths, tmp_path), tmp_path, 'verify', 'nope.html')
    _one_line_error(r, 3)
    assert 'nope.html' in r.stderr


def test_bad_template_is_missing_input(paths, tmp_path):
    r = _squat(paths, _root(paths, tmp_path), tmp_path, 'build', '--template', 'nope.html', '--out', str(tmp_path / 'x.html'))
    _one_line_error(r, 3)
    assert 'nope.html' in r.stderr and not (tmp_path / 'x.html').exists()


def test_verify_missing_shipped_manifest(paths, tmp_path, monkeypatch, capsys):
    import squat.paths as sp
    monkeypatch.setattr(sp.Paths, 'shipped_manifest', property(lambda self: tmp_path / 'gone.json'))
    page = tmp_path / 'p.html'
    page.write_text('<html></html>', encoding='utf-8')
    assert main(['verify', str(page)]) == 3
    assert 'gone.json' in capsys.readouterr().err


@pytest.mark.stl
def test_stage_build_defaults_to_dist(paths, tmp_path, need_stl):
    need_stl()
    project = tmp_path / 'proj'
    for name in ('squat', 'page'):
        (project / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(paths.project / name, project / name, ignore=shutil.ignore_patterns('__pycache__', 'template.html'))
    root = _root(paths, tmp_path, with_stl=True)
    env = {**os.environ, 'SQUAT_ROOT': str(root), 'PYTHONPATH': str(project)}
    r = subprocess.run([sys.executable, '-m', 'squat', 'stage', 'build'], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    assert (project / 'dist' / 'squat.html').is_file()
    assert sorted(p.name for p in (root / 'v3').iterdir()) == sorted(p.name for p in paths.v3.iterdir() if p.is_file())


@pytest.mark.stl
def test_verify_built_page(paths, built, tmp_path):
    r = _squat(paths, _root(paths, tmp_path), tmp_path, 'verify', str(built.out))
    assert r.returncode == 0, r.stdout + r.stderr
    assert 'data ok' in r.stdout and 'Traceback' not in r.stderr


@pytest.mark.stl
def test_verify_changed_page(paths, built, tmp_path):
    html = built.out.read_text(encoding='utf-8')
    a = html.index('"st_meta"')
    changed = html[:a] + '"st_meta_changed"' + html[a + len('"st_meta"'):]
    bad = tmp_path / 'bad.html'
    bad.write_text(changed, encoding='utf-8')
    r = _squat(paths, _root(paths, tmp_path), tmp_path, 'verify', str(bad))
    assert r.returncode == 1, r.stdout + r.stderr
    assert 'manifest' in r.stdout and 'MISMATCH' in r.stdout and 'Traceback' not in r.stderr
