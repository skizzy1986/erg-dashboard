"""Shoulder girdle: rest-bone registrations and the SC/AC rotation (was pipeline/v3/girdle.py)."""
from dataclasses import dataclass

import numpy as np

from squat.geom import rot_about, tpts


@dataclass(frozen=True, eq=False)
class Girdle:
    tcur: dict
    sc: np.ndarray
    ac: np.ndarray
    gh: np.ndarray

    def girdle(self, p):
        # p: [retraction deg, depression deg, scap rot about y at AC, scap rot about x at AC, scap rot about z at AC]
        SC=self.sc; AC=self.ac
        Rsc=rot_about([0,1,0],np.radians(-p[0]),SC)@rot_about([1,0,0],np.radians(p[1]),SC)
        acn=tpts(Rsc,AC[None])[0]
        Rac=rot_about([0,1,0],np.radians(p[2]),acn)@rot_about([1,0,0],np.radians(p[3]),acn)@rot_about([0,0,1],np.radians(p[4]),acn)
        return Rsc, Rac@Rsc


def load_girdle(paths, base):
    Pr=base.pr; pidr=base.pidr
    TC=np.load(paths.require('v3/Tcur.npy', 'fixed')); IDX=list(range(30))+[37,38]; Tcur={p:TC[i] for i,p in enumerate(IDX)}
    CLA=Pr[pidr==38]
    SC=CLA[np.argsort(CLA[:,2])[:15]].mean(0)                       # sternoclavicular joint
    AC=CLA[np.argsort(-CLA[:,2])[:15]].mean(0)                      # acromioclavicular joint
    GH=np.array([-0.0843,1.4726,0.1759])
    return Girdle(tcur=Tcur, sc=SC, ac=AC, gh=GH)
