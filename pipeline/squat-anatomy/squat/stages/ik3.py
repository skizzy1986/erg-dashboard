"""Arm/hand IK with ISB limits and the grip target, from the armik2 seed (was pipeline/v3/run_ik3.py). ~195 s."""
import time
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize

from squat.paths import MissingInputError
from squat.stages._io import cache, out_path

OUTPUTS = ('armik3_x.npy',)


@dataclass(frozen=True, eq=False)
class Result:
    x: np.ndarray


def compute(ctx, x2, log=print):
    arm=ctx.arm; cost3=arm.cost3; NV=arm.NV; gaps=arm.gaps; transforms=arm.transforms
    rs=np.random.RandomState(7); t0=time.time()
    starts=[x2,np.zeros(NV),0.5*x2]+[np.r_[x2[:7]+np.radians(rs.uniform(-15,15,7)),x2[7:]] for _ in range(3)]
    best=None
    for k,s0 in enumerate(starts):
        r=minimize(cost3,s0,method='L-BFGS-B',options={'maxiter':1500})
        c,parts,info=cost3(r.x,True)
        log(k,'cost %.4f'%r.fun,{kk:round(float(v),3 if kk=='z' else 1) for kk,v in info.items()},flush=True)
        if best is None or r.fun<best.fun: best=r
    x=best.x; c,parts,info=cost3(x,True)
    log('BEST cost %.4f'%c,{k:round(float(v),4) for k,v in parts.items()})
    log('angles:',{k:round(float(v),3 if k=='z' else 1) for k,v in info.items()})
    g=gaps(transforms(x)); log('min gaps mm:',[round(1000*g[p].min(),1) for p in [11,12,13,14,15,16,19,22,25,18,21,24,27,28,29]])
    log('time %.0fs'%(time.time()-t0))
    return Result(x=x)


def run(ctx, in_dir, out_dir, log=print):
    # armik2_x is a fixed input (its generator is in the preserve bundle), but --in-dir may supply another seed
    try:
        x2=np.load(cache(ctx, in_dir, 'armik2_x.npy'))
    except MissingInputError as e:
        raise MissingInputError(e.path, 'fixed') from None
    r=compute(ctx, x2, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    np.save(out['armik3_x.npy'], r.x)
    return out
