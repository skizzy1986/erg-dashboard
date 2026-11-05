"""Every path the pipeline touches, resolved from the environment or this file, never cwd."""
import os
from dataclasses import dataclass
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]

_HINT = {
    'fixed': 'no generator — restore with git checkout; see squat/inputs.py',
    'cache': 'regenerate it with python -m squat stage <name>; see python -m squat list',
    'stl': 'run scripts/fetch_stl.sh',
}


class MissingInputError(FileNotFoundError):
    def __init__(self, path, kind, hint=None):
        self.path = Path(path)
        self.kind = kind
        self.hint = hint or _HINT[kind]
        sep = f' ({self.hint})' if kind == 'fixed' else f' — {self.hint}'
        super().__init__(f'missing {self.label} {display(self.path)}{sep}')

    @property
    def label(self):
        return {'fixed': 'fixed input', 'cache': 'cache', 'stl': 'STL'}[self.kind]


def display(path):
    path = Path(path)
    try:
        return str(path.resolve().relative_to(PROJECT))
    except ValueError:
        return str(path)


@dataclass(frozen=True)
class Paths:
    data: Path
    project: Path = PROJECT

    @classmethod
    def from_env(cls):
        env = os.environ.get('SQUAT_ROOT')
        data = Path(env).resolve() if env else PROJECT / 'pipeline'
        return cls(data=data, project=PROJECT)

    @property
    def v3(self):
        return self.data / 'v3'

    @property
    def stl(self):
        return self.data / 'ext' / 'stl'

    @property
    def page(self):
        return self.project / 'page'

    @property
    def dist(self):
        return self.project / 'dist'

    @property
    def repo(self):
        return self.project.parents[1]

    @property
    def shipped_manifest(self):
        return self.repo / 'web' / 'src' / 'squat' / 'assets' / 'squat-manifest.json'

    def require(self, rel, kind, root=None, hint=None):
        """Resolve ``rel`` under ``root`` (default: the data dir) or raise MissingInputError."""
        p = (self.data if root is None else Path(root)) / rel
        if not p.is_file():
            raise MissingInputError(p, kind, hint)
        return p
