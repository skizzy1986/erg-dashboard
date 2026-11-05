"""Arm/hand IK re-solve with the thumb wrapped round the bar, from armik3 (was pipeline/v3/run_ik4.py). ~195 s."""
import time
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize

from squat.geom import tpts
from squat.stages._io import cache, out_path

OUTPUTS = ('armik4_x.npy',)


@dataclass(frozen=True, eq=False)
class Result:
    x: np.ndarray


def compute(ctx, x3, log=print):
    arm=ctx.arm; cost3=arm.cost3; gaps=arm.gaps; transforms=arm.transforms; bone_T=arm.bone_T; HV=arm.HV; BAR=arm.BAR
    t0=time.time()
    def thumb_ang(C):
        c=tpts(bone_T(C,29),HV[29]).mean(0); return np.degrees(np.arctan2(c[1]-BAR[1],c[0]-BAR[0]))
    def cost4(x,verbose=False):
        r=cost3(x,verbose)
        a=thumb_ang(transforms(x)); t=50*(max(0,np.radians(a-0))**2+max(0,np.radians(-70-a))**2)
        if verbose: c,parts,info=r; parts['thumb']=t; info['thumb']=a; return c+t,parts,info
        return r+t
    s1=x3.copy(); s1[19:21]=0
    s2=x3.copy(); s2[19:21]=np.radians([-30,-30])
    s3=x3.copy(); s3[19:21]=np.radians([30,30])
    best=None
    for k,s0 in enumerate([s1,s2,s3,x3]):
        r=minimize(cost4,s0,method='L-BFGS-B',options={'maxiter':1500})
        c,parts,info=cost4(r.x,True)
        log(k,'cost %.4f'%r.fun,{kk:round(float(v),3 if kk=='z' else 1) for kk,v in info.items()},flush=True)
        if best is None or r.fun<best.fun: best=r
    x=best.x; c,parts,info=cost4(x,True)
    log('BEST cost %.4f'%c,{k:round(float(v),4) for k,v in parts.items()})
    log('angles:',{k:round(float(v),3 if k=='z' else 1) for k,v in info.items()})
    g=gaps(transforms(x)); log('min gaps mm:',[round(1000*g[p].min(),1) for p in [11,12,13,14,15,16,19,22,25,18,21,24,27,28,29]])
    log('time %.0fs'%(time.time()-t0))
    return Result(x=x)


def run(ctx, in_dir, out_dir, log=print):
    x3=np.load(cache(ctx, in_dir, 'armik3_x.npy'))
    r=compute(ctx, x3, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    np.save(out['armik4_x.npy'], r.x)
    return out
