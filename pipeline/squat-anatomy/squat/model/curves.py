"""Muscle-path curves and the vertical-bar-path trunk re-balance (was pipeline/v3/curves.py + balance.py)."""
from dataclasses import dataclass

import numpy as np
from scipy.spatial.transform import Rotation as Rot

TRUNK_FR=('pelvis_rest','L5','L4','L3','L2','L1','thorax')


def rotz_about(ang,p):
    R=Rot.from_rotvec([0,0,ang]).as_matrix(); return R, p-R@p


@dataclass(frozen=True, eq=False)
class Curves:
    base: object
    cv: list
    ns: int
    cvp: np.ndarray
    cvq: np.ndarray
    offs: list
    bar_c: np.ndarray
    cop: np.ndarray

    def curve_pts(self, ci):
        CV=self.cv; NS=self.ns; offs=self.offs; CVP=self.cvp; CVQ=self.cvq
        n=CV[ci]['n']; o=offs[ci]; P=CVP[(o)*3:(o+NS*n)*3].reshape(NS,n,3)*5e-5; P=P.copy(); P[:,:,1]+=0.8
        Q=CVQ[o*4:(o+NS*n)*4].reshape(NS,n,4); Q=Q/np.linalg.norm(Q,axis=2,keepdims=True); return P,Q

    # ---- balance.py: rotate the pelvis-lumbar-thorax chain about the hip axis so the bar sits over midfoot
    def solve_delta(self, i, F):
        frame=self.base.frame; BAR_C=self.bar_c; COP=self.cop
        o,R=frame(i,'thorax',F); hip,_=frame(i,'femur_r',F); hip[2]=0
        b=o+R@BAR_C; v=b-hip
        # want hip.x + cos(d) v.x - sin(d) v.y = COP.x
        r=np.hypot(v[0],v[1]); phi=np.arctan2(v[1],v[0]); target=(COP[0]-hip[0])/r
        # x = r cos(phi + d)  -> d = acos(target) - phi  (choose the root closest to 0)
        c=np.arccos(np.clip(target,-1,1)); cands=[c-phi, -c-phi]
        cands=[((d+np.pi)%(2*np.pi))-np.pi for d in cands]; return min(cands,key=abs), hip

    def apply_frames(self, F, deltas, hips):
        FN=self.base.fn
        Fn=F.copy()
        for i,(d,hip) in enumerate(zip(deltas,hips)):
            Rz,t=rotz_about(d,hip)
            for j,n in enumerate(FN):
                if n in TRUNK_FR:
                    q=Fn[i,j,3:]; qn=(Rot.from_matrix(Rz)*Rot.from_quat(q)).as_quat()
                    if qn@q<0: qn=-qn
                    Fn[i,j,:3]=Rz@F[i,j,:3]+t; Fn[i,j,3:]=qn
        return Fn

    def corrected_curves(self, deltas, hips, alpha):
        CV=self.cv; NS=self.ns; offs=self.offs
        al=alpha; P_all=self.cvp.copy(); Q_all=self.cvq.copy()
        for ci in range(len(CV)):
            a=al[ci]
            if not np.any(a>0): continue
            n=CV[ci]['n']; o=offs[ci]
            P,Q=self.curve_pts(ci)
            for i in range(NS):
                ang=a*deltas[i]; hip=hips[i]
                Rv=Rot.from_rotvec(np.c_[np.zeros(n),np.zeros(n),ang])
                P[i]=Rv.apply(P[i]-hip)+hip
                Q[i]=(Rv*Rot.from_quat(Q[i])).as_quat()
            Pq=P.copy(); Pq[:,:,1]-=0.8
            P_all[o*3:(o+NS*n)*3]=(Pq/5e-5).reshape(-1)
            Q_all[o*4:(o+NS*n)*4]=(Q*32767).reshape(-1)
        return np.round(P_all).astype(np.int16), np.round(Q_all).astype(np.int16)


def load_curves(base):
    META=base.meta; ARR=base.arr
    CV=META['curves']; NS=len(META['S'])
    CVP=ARR['cv_pos'].astype(float); CVQ=ARR['cv_quat'].astype(float)
    CVP.flags.writeable=False; CVQ.flags.writeable=False
    offs=[]; o=0
    for c in CV: offs.append(o); o+=NS*c['n']
    BAR_C=np.array(META['bar']['c']); COP=np.array(META['cop'])
    return Curves(base=base, cv=CV, ns=NS, cvp=CVP, cvq=CVQ, offs=offs, bar_c=BAR_C, cop=COP)


def fixed_alpha(paths):
    al=list(np.load(paths.require('v3/curve_alpha.npy', 'fixed'),allow_pickle=True)); ends=np.load(paths.require('v3/curve_ends.npy', 'fixed'))
    TR={'pelvis_rest','L5','L4','L3','L2','L1','thorax'}
    out=[]
    for ci,a in enumerate(al):
        a=np.array(a,float); n=len(a); a0,a1=ends[ci]
        if (a0 in TR)!=(a1 in TR):
            s=np.linspace(0,1,n) if a0 in TR else np.linspace(1,0,n)      # 0 at trunk end
            head=np.clip(1-s/0.12,0,1); tail=np.clip((1-s)/0.15,0,1)
            a=np.maximum(a,head)*tail
        out.append(a)
    return out
