import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
import numpy as np
from scipy.spatial.transform import Rotation as Rot
def _qmul(a,b):
    w1,x1,y1,z1=a[...,0],a[...,1],a[...,2],a[...,3]; w2,x2,y2,z2=b[...,0],b[...,1],b[...,2],b[...,3]
    return np.stack([w1*w2-x1*x2-y1*y2-z1*z2, w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2],-1)
def mat_to_dq(M):
    R=M[:3,:3]; s=np.cbrt(np.linalg.det(R)); q=Rot.from_matrix(R/s).as_quat(); qr=np.array([q[3],q[0],q[1],q[2]])
    qd=0.5*_qmul(np.array([0,*M[:3,3]]),qr); return qr,qd,s
def dqs(V, W, Ms):
    """Dual-quaternion skinning. V (N,3), W (N,K) weights, Ms list of K 4x4 transforms sharing one uniform scale."""
    D=[mat_to_dq(M) for M in Ms]; QR=np.array([d[0] for d in D]); QD=np.array([d[1] for d in D]); s=D[0][2]
    piv=QR[np.argmax(W,1)]                                   # (N,4)
    sg=np.sign(np.einsum('nk,mk->nm',piv,QR)); sg[sg==0]=1    # (N,K)
    Wk=W*sg
    br=Wk@QR; bd=Wk@QD; nrm=np.linalg.norm(br,axis=1,keepdims=True); br/=nrm; bd/=nrm
    w,x,y,z=br[:,0:1],br[:,1:2],br[:,2:3],br[:,3:4]
    v=V*s
    # rotate v by br
    u=np.c_[x,y,z]; t2=2*np.cross(u,v); vr=v+w*t2+np.cross(u,t2)
    # translation t = 2 * (bd * conj(br)).xyz
    conj=np.c_[w,-x,-y,-z]; tq=_qmul(bd,conj); trans=2*tq[:,1:]
    return vr+trans
