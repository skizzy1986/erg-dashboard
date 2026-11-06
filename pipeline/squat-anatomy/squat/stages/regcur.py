"""Re-register the rest bones to the posed arm, producing Tcur.npy (was pipeline/v3/regcur.py).

Needs pipeline/T_arm_all.npy from the preserve bundle (ARCHIVE.md) and the 32 BONE_FID STLs.
"""
from dataclasses import dataclass

import numpy as np
import trimesh
from scipy.spatial import cKDTree

from squat.geom import BONE_FID, tpts
from squat.stages._io import out_path

OUTPUTS = ('Tcur.npy',)


@dataclass(frozen=True, eq=False)
class Result:
    tcur: np.ndarray


def compute(ctx, Told, log=print):
    base=ctx.base; stl=ctx.stl
    Pr=base.pr; pidr=base.pidr; Ir=base.ir; TG=base.tg; bmr=base.bmr
    _tc={}
    def target_pts(pids, n=20000):
        k=tuple(pids)
        if k not in _tc:
            m=np.isin(pidr,pids); tri=Ir[np.all(m[Ir],axis=1)]; mesh=trimesh.Trimesh(Pr,tri,process=False)
            pts,_=trimesh.sample.sample_surface(mesh,n,seed=1); pts=np.vstack([pts,Pr[m]]); _tc[k]=(pts,cKDTree(pts))
        return _tc[k]
    def icp(src,tgt,T0,iters=40,trim=95):
        pts,tree=tgt; T=T0.copy(); s=np.cbrt(np.linalg.det(T[:3,:3]))
        for _ in range(iters):
            P=tpts(T,src); d,ii=tree.query(P); b=pts[ii]; w=d<=np.percentile(d,trim); a=src[w]; b=b[w]
            ma,mb=a.mean(0),b.mean(0); U,S_,Vt=np.linalg.svd((b-mb).T@(a-ma)); D=np.diag([1,1,np.sign(np.linalg.det(U@Vt))]); R=U@D@Vt
            T=np.eye(4); T[:3,:3]=s*R; T[:3,3]=mb-s*R@ma
        d,_=tree.query(tpts(T,src)); return T, np.sqrt((d**2).mean())
    # initialise from previous registration and refine (current pose differs by small corrections)
    Tcur={}
    for p in list(range(30))+[37,38]:
        src=stl.vertices(BONE_FID[p])[::2 if p<3 or p>36 else 1]
        T0=Told[p] if p<30 else TG
        best=None
        # try previous transform, and previous transform re-centred on current bone centroid
        c_t=Pr[pidr==p].mean(0)
        cands=[T0]
        Tb=T0.copy(); Tb[:3,3]+=c_t-tpts(T0,src).mean(0); cands.append(Tb)
        for Tc in cands:
            T,rms=icp(src,target_pts([p]),Tc)
            if best is None or rms<best[1]: best=(T,rms)
        Tcur[p]=best[0]; log(p, bmr['names'][p][:26], 'rms mm %.2f'%(1000*best[1]))
    return Result(tcur=np.stack([Tcur[p] for p in list(range(30))+[37,38]]))


def run(ctx, in_dir, out_dir, log=print):
    Told=np.load(ctx.paths.require('T_arm_all.npy', 'fixed', hint='not in git: take it from the preserve bundle, see ARCHIVE.md'))
    r=compute(ctx, Told, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    np.save(out['Tcur.npy'], r.tcur)
    return out
