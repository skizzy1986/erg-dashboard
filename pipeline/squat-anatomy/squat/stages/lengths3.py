"""Musculotendon path length per curve-skinned muscle across depth, % of standing (was pipeline/v3/lengths3.py)."""
import collections
from dataclasses import dataclass

import numpy as np
from scipy.spatial.transform import Rotation as Rot

from squat.model.curves import fixed_alpha
from squat.stages._io import cache, out_path, save_pickle

OUTPUTS = ('mlen3.pkl',)


@dataclass(frozen=True, eq=False)
class Result:
    mlen: dict


def compute(ctx, deltas, hips, al, log=print):
    META=ctx.base.meta; ARR=ctx.base.arr; CV=ctx.curves.cv; NS=ctx.curves.ns; curve_pts=ctx.curves.curve_pts
    def curve_len(ci):
        P,Q=curve_pts(ci); a=al[ci]; n=CV[ci]['n']
        if np.any(a>0):
            for i in range(NS):
                Rv=Rot.from_rotvec(np.c_[np.zeros(n),np.zeros(n),a*deltas[i]]); P[i]=Rv.apply(P[i]-hips[i])+hips[i]
        return np.linalg.norm(np.diff(P,axis=1),axis=2).sum(1)
    CL=np.array([curve_len(ci) for ci in range(len(CV))])          # (ncurves, NS)
    mid=ARR['cm_mid']; c1=ARR['cm_c1']; c2=ARR['cm_c2']; w=ARR['cm_w']/255.
    W=collections.defaultdict(lambda: collections.Counter())
    for m,a_,b_,ww in zip(mid,c1,c2,w): W[int(m)][int(a_)]+=ww; W[int(m)][int(b_)]+=1-ww
    ML={}
    for m,cnt in W.items():
        tot=sum(cnt.values()); L=sum(v*CL[c] for c,v in cnt.items())/tot
        ML[m]=100*L/L[0]
    MN=[x['name'] for x in META['muscles']]
    for m in sorted(ML):
        L=ML[m]; sl=np.gradient(L,np.array(META['S']))
        log('%-34s bottom %6.1f%%  min %6.1f max %6.1f   slope@0.5 %+6.1f  slope@0.95 %+6.1f'%(MN[m],L[-1],L.min(),L.max(),sl[20],sl[38]))
    return Result(mlen=ML)


def run(ctx, in_dir, out_dir, log=print):
    deltas=np.load(cache(ctx, in_dir, 'deltas3.npy')); hips=list(np.load(cache(ctx, in_dir, 'hips3.npy')))
    al=fixed_alpha(ctx.paths)
    r=compute(ctx, deltas, hips, al, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    save_pickle(r.mlen, out['mlen3.pkl'])
    return out
