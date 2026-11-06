"""Arm and hand: joint axes, transforms, ISB angles and the IK costs.

Holds the import-time state of pipeline/v3/armik.py, armik2.py, isb.py (above its
``__main__``) and armik3.py. Every expression is copied from those files; only the
name lookups changed (a global X is now ``self.X``).
"""
from dataclasses import dataclass

import numpy as np
from numpy.linalg import norm
from scipy.spatial.transform import Rotation as Rot

from squat.geom import Rof, inv, rot_about, screw, tpts
from squat.model.skin import group_of_pid

GRIP_Z=0.40


@dataclass(frozen=True, eq=False)
class Arm:
    Tcur: dict
    Pr: np.ndarray
    pidr: np.ndarray
    GH: np.ndarray
    RSC: np.ndarray
    RS: np.ndarray
    BAR: np.ndarray
    RB: float
    ELB: tuple
    PRO: tuple
    EPI_M: np.ndarray
    EPI_L: np.ndarray
    RS_: np.ndarray
    US_: np.ndarray
    MC3_0: np.ndarray
    CAP0: np.ndarray
    WC: np.ndarray
    WF: np.ndarray
    WD: np.ndarray
    CH: dict
    FJ: dict
    NV: int
    HP: list
    HV: dict
    MARG: dict
    SIG: np.ndarray
    GH_NEW: np.ndarray
    GH0: np.ndarray
    Y0: np.ndarray
    Z0: np.ndarray
    IJ: np.ndarray
    PX: np.ndarray
    C7: np.ndarray
    T8: np.ndarray
    TF: np.ndarray

    # ---- armik.py
    def transforms(self, x):
        GH=self.GH; ELB=self.ELB; PRO=self.PRO; WF=self.WF; WC=self.WC; WD=self.WD; FJ=self.FJ
        Rgh=np.eye(4); rv=x[:3]
        if np.linalg.norm(rv)>0: Rgh=rot_about(rv,np.linalg.norm(rv),GH)
        C={'thx':np.eye(4),'cla':self.RSC,'sca':self.RS}
        C['hum']=self.RS@Rgh
        C['uln']=C['hum']@rot_about(ELB[0],x[3],ELB[1])
        C['rad']=C['uln']@rot_about(PRO[0],x[4],PRO[1])
        C['hand']=C['rad']@rot_about(WF,x[5],WC)@rot_about(WD,x[6],WC)
        k=7
        for f,(mc,p1,p2,p3) in self.CH.items():
            R1=rot_about(FJ[(mc,p1)][0],x[k],FJ[(mc,p1)][1]); R2=rot_about(FJ[(p1,p2)][0],x[k+1],FJ[(p1,p2)][1]); R3=rot_about(FJ[(p2,p3)][0],x[k+2],FJ[(p2,p3)][1])
            C[f'ph{p1}']=C['hand']@R1; C[f'ph{p2}']=C[f'ph{p1}']@R2; C[f'ph{p3}']=C[f'ph{p2}']@R3; k+=3
        C['ph28']=C['hand']@rot_about(FJ[(11,28)][0],x[k],FJ[(11,28)][1]); C['ph29']=C['ph28']@rot_about(FJ[(28,29)][0],x[k+1],FJ[(28,29)][1])
        return C

    def bone_T(self, C, p): return C[group_of_pid(p)]

    def gaps(self, C):
        return {p:np.hypot(*(tpts(self.bone_T(C,p),self.HV[p])[:,:2]-self.BAR).T)-self.RB for p in self.HP}

    def wrist_angles(self, C):
        Tcur=self.Tcur
        em=tpts(C['hum']@Tcur[0],self.EPI_M[None])[0]; el=tpts(C['hum']@Tcur[0],self.EPI_L[None])[0]
        rs=tpts(C['rad']@Tcur[2],self.RS_[None])[0]; us=tpts(C['uln']@Tcur[1],self.US_[None])[0]
        elb=(em+el)/2; wr=(rs+us)/2; f=wr-elb; f/=norm(f)
        rd=rs-us; rd-=(rd@f)*f; rd/=norm(rd); pal=np.cross(rd,f)
        mc3=tpts(C['hand']@Tcur[13],self.MC3_0); cap=tpts(C['hand']@Tcur[9],self.CAP0).mean(0)
        tip=mc3[np.argmin(self.MC3_0[:,2])]; h=tip-cap; h/=norm(h)
        return np.degrees(np.arctan2(h@rd,h@f)), np.degrees(np.arctan2(h@pal,h@f)), elb

    def cost(self, x, verbose=False):
        C=self.transforms(x); g=self.gaps(C); c=0; parts={}
        parts['pen']=sum(1e4*np.sum(np.maximum(0,self.MARG[p]-g[p])**2) for p in self.HP)
        sn=0
        for f,(mc,p1,p2,p3) in self.CH.items():
            sn+=3e3*(min(g[p1].min(),g[p2].min())-self.MARG[p1])**2+3e3*(g[p3].min()-self.MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
        sn+=1e3*(min(g[28].min(),g[29].min())-self.MARG[28])**2; parts['snug']=sn
        dev,fl,elb=self.wrist_angles(C)
        parts['wrist']=3e2*(max(0,np.radians(abs(dev)-6))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-15))**2)
        v=elb-self.GH_NEW; ang=np.degrees(np.arccos(-v[1]/norm(v)))      # 0 = elbow straight below shoulder
        parts['elbow']=1e2*max(0,np.radians(ang-32))**2
        parts['reg']=0.02*np.sum((x/self.SIG)**2)
        c=sum(parts.values())
        return (c,parts,dev,fl,ang) if verbose else c

    # ---- armik2.py
    def hframe(self, Th):
        gh=tpts(Th,self.GH0[None])[0]; em=tpts(Th,self.EPI_M[None])[0]; el=tpts(Th,self.EPI_L[None])[0]; ec=(em+el)/2
        y=gh-ec; y/=norm(y); z=el-em; z-=(z@y)*y; z/=norm(z); return gh,ec,y,z

    def shoulder_angles(self, Th):
        Y0=self.Y0; Z0=self.Z0
        gh,ec,y,z=self.hframe(Th)
        elev=np.degrees(np.arccos(np.clip(-y@np.array([0,-1,0]),-1,1)))         # 0 = arm hanging straight down
        # swing rest long axis Y0 onto y, then twist = angle between swung Z0 and z about y  (+ = external for right arm)
        ax=np.cross(Y0,y); s=norm(ax); c=Y0@y
        Rs=np.eye(3) if s<1e-9 else Rot.from_rotvec(ax/s*np.arctan2(s,c)).as_matrix()
        z0=Rs@Z0; tw=np.degrees(np.arctan2(np.cross(z0,z)@y, z0@z))
        v=ec-gh; plane=np.degrees(np.arctan2(v[0],v[2]))     # 0 = pure abduction (lateral), + = elbow forward, - = elbow behind
        return elev, tw, plane, gh, ec

    def elbow_flex(self, C):
        Tcur=self.Tcur
        gh,ec,_,_=self.hframe(C['hum']@Tcur[0])
        rs=tpts(C['rad']@Tcur[2],self.RS_[None])[0]; us=tpts(C['uln']@Tcur[1],self.US_[None])[0]; wr=(rs+us)/2
        a=ec-gh; b=wr-ec; return np.degrees(np.arccos(np.clip(a@b/norm(a)/norm(b),-1,1)))

    def cost2(self, x, verbose=False):
        C=self.transforms(x); g=self.gaps(C); parts={}
        parts['pen']=sum(1e4*np.sum(np.maximum(0,self.MARG[p]-g[p])**2) for p in self.HP)
        sn=0
        for f,(mc,p1,p2,p3) in self.CH.items():
            sn+=3e3*(min(g[p1].min(),g[p2].min())-self.MARG[p1])**2+3e3*(g[p3].min()-self.MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
        sn+=1e3*(min(g[28].min(),g[29].min())-self.MARG[28])**2; parts['snug']=sn
        dev,fl,_=self.wrist_angles(C)
        parts['wrist']=3e2*(max(0,np.radians(abs(dev)-8))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-20))**2)
        elev,tw,plane,gh,ec=self.shoulder_angles(C['hum']@self.Tcur[0]); ef=self.elbow_flex(C)
        lim=0
        er=-tw                                                                   # + = external rotation (right arm)
        lim+=max(0,np.radians(er-90))**2 + max(0,np.radians(-er-10))**2           # external rotation <= 90 deg
        lim+=max(0,np.radians(elev-60))**2 + max(0,np.radians(25-elev))**2
        lim+=max(0,np.radians(ef-135))**2 + max(0,np.radians(-plane-35))**2 + max(0,np.radians(plane-10))**2
        parts['limits']=3e3*lim
        v=ec-gh; ang=np.degrees(np.arccos(np.clip(-v[1]/norm(v),-1,1)))
        parts['elbow_down']=50*max(0,np.radians(ang-50))**2
        parts['reg']=0.004*np.sum((x/self.SIG)**2)
        c=sum(parts.values())
        return (c,parts,dict(dev=dev,fl=fl,elev=elev,er=-tw,plane=plane,elbow=ef)) if verbose else c

    # ---- isb.py: ISB (Wu et al. 2005) humerothoracic angles, YXY decomposition
    def hum_frame(self, Th):
        gh=tpts(Th,self.GH0[None])[0]; em=tpts(Th,self.EPI_M[None])[0]; el=tpts(Th,self.EPI_L[None])[0]; ec=(em+el)/2
        y=gh-ec; y/=norm(y); x=np.cross(y, el-em); x/=norm(x)       # anterior (right arm: y up, el lateral -> y x (el-em) points forward)
        z=np.cross(x,y); return np.c_[x,y,z], gh, ec

    def isb_angles(self, Th):
        H,gh,ec=self.hum_frame(Th); R=self.TF.T@H
        a,b,g=Rot.from_matrix(R).as_euler('YXY',degrees=True)
        p=a+180; e=-b; ax=g-180
        w=lambda t:(t+180)%360-180
        return dict(plane=w(p), elev=-e, er=-w(ax))

    # ---- armik3.py
    def mc3z(self, C): return tpts(C['hand']@self.Tcur[13],self.MC3_0).mean(0)[2]

    def cost3(self, x, verbose=False):
        C=self.transforms(x); g=self.gaps(C); parts={}
        parts['pen']=sum(1e4*np.sum(np.maximum(0,self.MARG[p]-g[p])**2) for p in self.HP)
        sn=0
        for f,(mc,p1,p2,p3) in self.CH.items():
            sn+=3e3*(min(g[p1].min(),g[p2].min())-self.MARG[p1])**2+3e3*(g[p3].min()-self.MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
        sn+=1e3*(min(g[28].min(),g[29].min())-self.MARG[28])**2; parts['snug']=sn
        dev,fl,_=self.wrist_angles(C)
        parts['wrist']=3e2*(max(0,np.radians(abs(dev)-6))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-15))**2) + 2*np.radians(fl)**2 + 2*np.radians(dev)**2
        a=self.isb_angles(C['hum']@self.Tcur[0]); ef=self.elbow_flex(C)
        lim =max(0,np.radians(a['er']-90))**2 + max(0,np.radians(-a['er']))**2
        lim+=max(0,np.radians(a['elev']-65))**2 + max(0,np.radians(25-a['elev']))**2
        lim+=max(0,np.radians(ef-135))**2 + max(0,np.radians(-a['plane']-45))**2 + max(0,np.radians(a['plane']-10))**2
        parts['limits']=3e3*lim
        gh,ec,_,_=self.hframe(C['hum']@self.Tcur[0]); v=ec-gh; ang=np.degrees(np.arccos(np.clip(-v[1]/norm(v),-1,1)))
        parts['elbow_down']=50*max(0,np.radians(ang-50))**2
        parts['grip']=5e2*(self.mc3z(C)-GRIP_Z)**2
        parts['reg']=0.004*np.sum((x/self.SIG)**2)
        c=sum(parts.values())
        return (c,parts,dict(dev=dev,fl=fl,elev=a['elev'],er=a['er'],plane=a['plane'],elbow=ef,z=self.mc3z(C))) if verbose else c


def load_arm(paths, base, girdle, stl):
    Pr=base.pr; pidr=base.pidr; Tcur=girdle.tcur; META=base.meta; TG=base.tg; GH=girdle.gh
    # ---- armik.py
    PG=np.load(paths.require('v3/girdle_p.npy', 'fixed')); RSC,RS=girdle.girdle(PG)
    BAR=np.load(paths.require('v3/bar_seat.npy', 'fixed')); RB=META['bar']['r']
    def jax(a,b,near):
        ax,ang,p=screw(Tcur[b]@inv(Tcur[a])); p=p+ax*((near-p)@ax); return ax,p,np.degrees(ang)
    ELB=jax(0,1,Pr[pidr==0][np.argmin(Pr[pidr==0][:,1])])
    PRO=jax(1,2,Pr[pidr==2].mean(0))
    H0=stl.vertices('FMA23130'); R0=stl.vertices('FMA23464'); U0=stl.vertices('FMA23467')
    lowH=H0[H0[:,2]<H0[:,2].min()+40]; EPI_M=lowH[np.argmax(lowH[:,0])]; EPI_L=lowH[np.argmin(lowH[:,0])]
    RS_=R0[np.argmin(R0[:,2])]; US_=U0[np.argmin(U0[:,2])]
    MC3_0=stl.vertices('FMA24468'); CAP0=stl.vertices('FMA24446'); LUN0=stl.vertices('FMA24437')
    RR=Rof(Tcur[2]); WC=tpts(Tcur[4],LUN0).mean(0)                 # wrist centre ~ lunate
    WF=(RR@np.array([1.,0,0])); WD=(RR@np.array([0,1.,0]))         # flexion (med-lat) and deviation (AP) axes
    CH={'index':(12,16,17,18),'middle':(13,19,20,21),'ring':(14,22,23,24),'little':(15,25,26,27)}
    FJ={}
    for f,ch in CH.items():
        for a,b in zip(ch[:-1],ch[1:]): FJ[(a,b)]=jax(a,b,Pr[pidr==b].mean(0))
    FJ[(11,28)]=jax(11,28,Pr[pidr==28].mean(0)); FJ[(28,29)]=jax(28,29,Pr[pidr==29].mean(0))
    NV=3+1+1+2+12+2
    HP=list(range(3,30)); HV={p:Pr[pidr==p] for p in HP}
    MARG={**{p:0.0065 for p in range(3,16)},**{p:0.0045 for p in range(16,30)}}
    SIG=np.radians([10,10,10, 12, 15, 15,15]+[12]*12+[10,10])
    GH_NEW=tpts(RS,GH[None])[0]
    # ---- armik2.py
    H0v=stl.vertices('FMA23130'); _top=H0v[H0v[:,2]>H0v[:,2].max()-35]
    _A=np.c_[2*_top,np.ones(len(_top))]; _b=(_top**2).sum(1); _cc,*_=np.linalg.lstsq(_A,_b,rcond=None); GH0=_cc[:3]
    def hframe(Th):
        gh=tpts(Th,GH0[None])[0]; em=tpts(Th,EPI_M[None])[0]; el=tpts(Th,EPI_L[None])[0]; ec=(em+el)/2
        y=gh-ec; y/=norm(y); z=el-em; z-=(z@y)*y; z/=norm(z); return gh,ec,y,z
    _gh0,_ec0,Y0,Z0=hframe(TG)
    # ---- isb.py: thorax frame from IJ/PX/C7/T8
    Pt_t,pid_t,bm_t=base.bone('thorax'); _n=bm_t['names']
    def _pts(name): return Pt_t[pid_t==_n.index(name)]
    _man=_pts('Manubrium'); _xi=_pts('Xiphoid process'); _c7=_pts('Seventh cervical vertebra'); _t8=_pts('Eighth thoracic vertebra')
    def _mid(P): return P[np.abs(P[:,2])<0.006]
    IJ=_mid(_man)[np.argmax(_mid(_man)[:,1])]; PX=_mid(_xi)[np.argmin(_mid(_xi)[:,1])]; C7=_mid(_c7)[np.argmin(_mid(_c7)[:,0])]; T8=_mid(_t8)[np.argmin(_mid(_t8)[:,0])]
    _yt=(IJ+C7)/2-(PX+T8)/2; _yt[2]=0; _yt/=norm(_yt)          # model is mirror-symmetric: keep the thorax frame in the sagittal plane
    _zt=np.array([0,0,1.]); _xt=np.cross(_yt,_zt); _xt/=norm(_xt)
    TF=np.c_[_xt,_yt,_zt]
    return Arm(Tcur=Tcur, Pr=Pr, pidr=pidr, GH=GH, RSC=RSC, RS=RS, BAR=BAR, RB=RB, ELB=ELB, PRO=PRO, EPI_M=EPI_M,
               EPI_L=EPI_L, RS_=RS_, US_=US_, MC3_0=MC3_0, CAP0=CAP0, WC=WC, WF=WF, WD=WD, CH=CH, FJ=FJ, NV=NV, HP=HP,
               HV=HV, MARG=MARG, SIG=SIG, GH_NEW=GH_NEW, GH0=GH0, Y0=Y0, Z0=Z0, IJ=IJ, PX=PX, C7=C7, T8=T8, TF=TF)
