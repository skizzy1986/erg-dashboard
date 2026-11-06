"""AC1: no Python file in the project calls the exec or globals builtins."""
import ast
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SKIP = {'node_modules', '.pytest_cache', '__pycache__'}
SKIP_DIRS = ('pipeline/ext/',)


def _files():
    for p in sorted(PROJECT.rglob('*.py')):
        rel = p.relative_to(PROJECT)
        if not SKIP.intersection(rel.parts) and not rel.as_posix().startswith(SKIP_DIRS):
            yield p


def _bad_calls(tree):
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        f = node.func
        if isinstance(f, ast.Name) and f.id in ('exec', 'globals'):
            yield node.lineno, f.id
        elif isinstance(f, ast.Attribute) and f.attr == 'exec' and isinstance(f.value, ast.Name) and f.value.id == 'builtins':
            yield node.lineno, 'builtins.exec'


def test_scans_the_package():
    names = {p.relative_to(PROJECT).as_posix() for p in _files()}
    assert 'squat/build.py' in names and 'page/assemble.py' in names


def test_no_exec_calls():
    bad = [f'{p.relative_to(PROJECT)}:{ln} {name}()' for p in _files()
           for ln, name in _bad_calls(ast.parse(p.read_text(encoding='utf-8')))]
    assert not bad, 'exec/globals calls found:\n' + '\n'.join(bad)
