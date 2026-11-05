"""One object owning the derived model state, each piece built at most once per process."""
from functools import cached_property

from squat.model.arm import load_arm
from squat.model.base import load_base
from squat.model.curves import load_curves
from squat.model.girdle import load_girdle
from squat.model.kinetics import Kinetics
from squat.model.readouts import load_readouts
from squat.model.skin import load_skin
from squat.model.stl import StlCache
from squat.paths import Paths


class Context:
    def __init__(self, paths=None):
        self.paths = Paths.from_env() if paths is None else paths

    @cached_property
    def base(self):
        return load_base(self.paths)

    @cached_property
    def stl(self):
        return StlCache(self.paths)

    @cached_property
    def girdle(self):
        return load_girdle(self.paths, self.base)

    @cached_property
    def skin(self):
        return load_skin(self.base)

    @cached_property
    def arm(self):
        """The only property that reads STLs (the 6 in inputs.STL_BUILD)."""
        return load_arm(self.paths, self.base, self.girdle, self.stl)

    @cached_property
    def readouts(self):
        return load_readouts(self.base)

    @cached_property
    def curves(self):
        return load_curves(self.base)

    @cached_property
    def kin(self):
        return Kinetics(self.base, self.arm, self.readouts, self.curves)
