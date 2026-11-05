"""Lordosis, knee-over-foot and shin readouts (was pipeline/v3/extra_readouts.py)."""
from dataclasses import dataclass

import numpy as np
from numpy.linalg import norm

from squat.geom import tpts


def disc_normal(P):
    c=P.mean(0); U,S,Vt=np.linalg.svd(P-c); n=Vt[2]; return c,n*np.sign(n[1])


@dataclass(frozen=True, eq=False)
class Readouts:
    base: object
    disc: dict
    heel: np.ndarray
    toe2: np.ndarray
    fax: np.ndarray
    foot_len: float
    epi: np.ndarray
    pcen: np.ndarray

    def extra(self, i, F):
        frame=self.base.frame; DISC=self.disc; HEEL=self.heel; FAX=self.fax
        nT=frame(i,'thorax',F)[1]@DISC['T12'][1]; nS=frame(i,'L5',F)[1]@DISC['L5'][1]
        lord=np.degrees(np.arctan2(nS[0],nS[1])-np.arctan2(nT[0],nT[1]))
        o,R=frame(i,'patella_r',F); p=o+R@self.pcen; rel=p-HEEL; lat=rel[0]*(-FAX[2])+rel[2]*FAX[0]
        ok,Rk=frame(i,'femur_r',F); k=ok+Rk@self.epi; oa,_=frame(i,'talus_r',F)
        sh=k-oa; shin=np.degrees(np.arccos(sh[1]/norm(sh)))
        return lord, lat, shin


def load_readouts(base):
    bone=base.bone; META=base.meta
    DISC={}
    for g in ['L5']:
        P,pid,bm=bone(g); DISC[g]=disc_normal(P[pid==[k for k,n in enumerate(bm['names']) if 'disk' in n.lower()][0]])
    Pt,pidt,bmt=bone('thorax'); DISC['T12']=disc_normal(Pt[pidt==[k for k,n in enumerate(bmt['names']) if 'twelfth thoracic' in n.lower() and 'disk' in n.lower()][0]])
    St=META['static']; Tc=np.array(St['calcn_r']); Tt=np.array(St['toes_r'])
    Pc,pidc,bmc=bone('calcn_r'); Ptoe,pidtt,bmtt=bone('toes_r')
    Wc=tpts(Tc,Pc); Wt=tpts(Tt,Ptoe)
    cal=Wc[pidc==bmc['names'].index('Calcaneus')]; HEEL=cal[np.argmin(cal[:,0])]
    q=Wt[pidtt==bmtt['names'].index('Distal phalanx of second toe')]; TOE2=q[np.argmax(q[:,0])]
    FAX=TOE2-HEEL; FAX[1]=0; FAX/=norm(FAX)
    FOOT_LEN=norm((TOE2-HEEL)[[0,2]])+0.015      # bone length + ~1.5 cm soft tissue (heel pad + toe pulp)
    Pf,pidf,bmf=bone('femur_r'); low=Pf[Pf[:,1]<Pf[:,1].min()+0.06]; EPI=(low[np.argmin(low[:,2])]+low[np.argmax(low[:,2])])/2
    Pp,_,_=bone('patella_r'); PCEN=Pp.mean(0)
    return Readouts(base=base, disc=DISC, heel=HEEL, toe2=TOE2, fax=FAX, foot_len=FOOT_LEN, epi=EPI, pcen=PCEN)
