"""The decoded v2 page (pipeline/v3/base.html) and its frame/bone helpers (was pipeline/v3/base.py)."""
import copy
from dataclasses import dataclass

import numpy as np

from squat import repack
from squat.geom import qR


@dataclass(frozen=True, eq=False)
class Base:
    html: str
    man: dict
    arr: dict
    meta: dict
    fn: list
    fr: np.ndarray
    pr: np.ndarray
    pidr: np.ndarray
    bmr: dict
    ir: np.ndarray
    tg: np.ndarray

    def frame(self, i, n, F=None):
        F=self.fr if F is None else F; j=self.fn.index(n); return F[i,j,:3].copy(), qR(F[i,j,3:])

    def bone(self, g, arr=None):
        return _bone(self.meta, self.arr if arr is None else arr, g)

    def fresh_copy(self):
        """What build3.py got from a fourth load(base.html): a manifest and arrays it may mutate."""
        return self.html, copy.deepcopy(self.man), {k: v.copy() for k, v in self.arr.items()}


def _bone(meta, a, g):
    bm=meta['bones'][g]
    return a[f'bone_{g}_pos'].astype(float)*bm['s']+np.array(bm['c']), a[f'bone_{g}_id'], bm


def _readonly(a):
    a.flags.writeable = False
    return a


def load_base(paths):
    html, man, arr = repack.load(paths.require('v3/base.html', 'fixed'))
    for a in arr.values():
        _readonly(a)
    meta = man['meta']
    fr = _readonly(arr['frames'].astype(float))
    Pr,pidr,bmr=_bone(meta, arr, 'thoraxR'); Ir=arr['bone_thoraxR_idx'].reshape(-1,3)
    TG=np.load(paths.require('T_global.npy', 'fixed'))
    return Base(html=html, man=man, arr=arr, meta=meta, fn=meta['frames'], fr=fr, pr=_readonly(Pr), pidr=pidr,
                bmr=bmr, ir=Ir, tg=_readonly(TG))
