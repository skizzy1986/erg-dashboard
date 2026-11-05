"""BodyParts3D STLs, loaded once each (was base.py:load_bp, called afresh at every use)."""
import trimesh

from squat.paths import MissingInputError


class StlCache:
    def __init__(self, paths):
        self.paths = paths
        self._mesh = {}

    def path(self, fid):
        p = self.paths.stl / f'{fid}.stl'
        if not p.is_file():
            raise MissingInputError(p, 'stl')
        return p

    def mesh(self, fid):
        """trimesh.load with its default arguments, as base.py:load_bp called it. Vertices are read-only:
        callers share one array per file, so an in-place write would leak into every later reader."""
        if fid not in self._mesh:
            m = trimesh.load(str(self.path(fid)))
            m.vertices.flags.writeable = False
            self._mesh[fid] = m
        return self._mesh[fid]

    def vertices(self, fid):
        return self.mesh(fid).vertices
