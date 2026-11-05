import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/skinlib.py').read())
from scipy.optimize import minimize
PG=np.load(SP+'v3/girdle_p.npy'); RSC,RS=girdle(PG)
BAR=np.load(SP+'v3/bar_seat.npy'); RB=META['bar']['r']
def Rof(M): return M[:3,:3]/np.cbrt(np.linalg.det(M[:3,:3]))
def jax(a,b,near):
    ax,ang,p=screw(Tcur[b]@inv(Tcur[a])); p=p+ax*((near-p)@ax); return ax,p,np.degrees(ang)
ELB=jax(0,1,Pr[pidr==0][np.argmin(Pr[pidr==0][:,1])])
PRO=jax(1,2,Pr[pidr==2].mean(0))
H0=load_bp('FMA23130').vertices; R0=load_bp('FMA23464').vertices; U0=load_bp('FMA23467').vertices
lowH=H0[H0[:,2]<H0[:,2].min()+40]; EPI_M=lowH[np.argmax(lowH[:,0])]; EPI_L=lowH[np.argmin(lowH[:,0])]
RS_=R0[np.argmin(R0[:,2])]; US_=U0[np.argmin(U0[:,2])]
MC3_0=load_bp('FMA24468').vertices; CAP0=load_bp('FMA24446').vertices; LUN0=load_bp('FMA24437').vertices
RR=Rof(Tcur[2]); WC=tpts(Tcur[4],LUN0).mean(0)                 # wrist centre ~ lunate
WF=(RR@np.array([1.,0,0])); WD=(RR@np.array([0,1.,0]))         # flexion (med-lat) and deviation (AP) axes
CH={'index':(12,16,17,18),'middle':(13,19,20,21),'ring':(14,22,23,24),'little':(15,25,26,27)}
FJ={}
for f,ch in CH.items():
    for a,b in zip(ch[:-1],ch[1:]): FJ[(a,b)]=jax(a,b,Pr[pidr==b].mean(0))
FJ[(11,28)]=jax(11,28,Pr[pidr==28].mean(0)); FJ[(28,29)]=jax(28,29,Pr[pidr==29].mean(0))
NV=3+1+1+2+12+2
def transforms(x):
    Rgh=np.eye(4); rv=x[:3]
    if np.linalg.norm(rv)>0: Rgh=rot_about(rv,np.linalg.norm(rv),GH)
    C={'thx':np.eye(4),'cla':RSC,'sca':RS}
    C['hum']=RS@Rgh
    C['uln']=C['hum']@rot_about(ELB[0],x[3],ELB[1])
    C['rad']=C['uln']@rot_about(PRO[0],x[4],PRO[1])
    C['hand']=C['rad']@rot_about(WF,x[5],WC)@rot_about(WD,x[6],WC)
    k=7
    for f,(mc,p1,p2,p3) in CH.items():
        R1=rot_about(FJ[(mc,p1)][0],x[k],FJ[(mc,p1)][1]); R2=rot_about(FJ[(p1,p2)][0],x[k+1],FJ[(p1,p2)][1]); R3=rot_about(FJ[(p2,p3)][0],x[k+2],FJ[(p2,p3)][1])
        C[f'ph{p1}']=C['hand']@R1; C[f'ph{p2}']=C[f'ph{p1}']@R2; C[f'ph{p3}']=C[f'ph{p2}']@R3; k+=3
    C['ph28']=C['hand']@rot_about(FJ[(11,28)][0],x[k],FJ[(11,28)][1]); C['ph29']=C['ph28']@rot_about(FJ[(28,29)][0],x[k+1],FJ[(28,29)][1])
    return C
def bone_T(C,p): return C[group_of_pid(p)]
HP=list(range(3,30)); HV={p:Pr[pidr==p] for p in HP}
MARG={**{p:0.0065 for p in range(3,16)},**{p:0.0045 for p in range(16,30)}}
def gaps(C):
    return {p:np.hypot(*(tpts(bone_T(C,p),HV[p])[:,:2]-BAR).T)-RB for p in HP}
def wrist_angles(C):
    em=tpts(C['hum']@Tcur[0],EPI_M[None])[0]; el=tpts(C['hum']@Tcur[0],EPI_L[None])[0]
    rs=tpts(C['rad']@Tcur[2],RS_[None])[0]; us=tpts(C['uln']@Tcur[1],US_[None])[0]
    elb=(em+el)/2; wr=(rs+us)/2; f=wr-elb; f/=norm(f)
    rd=rs-us; rd-=(rd@f)*f; rd/=norm(rd); pal=np.cross(rd,f)
    mc3=tpts(C['hand']@Tcur[13],MC3_0); cap=tpts(C['hand']@Tcur[9],CAP0).mean(0)
    tip=mc3[np.argmin(MC3_0[:,2])]; h=tip-cap; h/=norm(h)
    return np.degrees(np.arctan2(h@rd,h@f)), np.degrees(np.arctan2(h@pal,h@f)), elb
SIG=np.radians([10,10,10, 12, 15, 15,15]+[12]*12+[10,10])
GH_NEW=tpts(RS,GH[None])[0]
def cost(x,verbose=False):
    C=transforms(x); g=gaps(C); c=0; parts={}
    parts['pen']=sum(1e4*np.sum(np.maximum(0,MARG[p]-g[p])**2) for p in HP)
    sn=0
    for f,(mc,p1,p2,p3) in CH.items():
        sn+=3e3*(min(g[p1].min(),g[p2].min())-MARG[p1])**2+3e3*(g[p3].min()-MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
    sn+=1e3*(min(g[28].min(),g[29].min())-MARG[28])**2; parts['snug']=sn
    dev,fl,elb=wrist_angles(C)
    parts['wrist']=3e2*(max(0,np.radians(abs(dev)-6))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-15))**2)
    v=elb-GH_NEW; ang=np.degrees(np.arccos(-v[1]/norm(v)))      # 0 = elbow straight below shoulder
    parts['elbow']=1e2*max(0,np.radians(ang-32))**2
    parts['reg']=0.02*np.sum((x/SIG)**2)
    c=sum(parts.values())
    return (c,parts,dev,fl,ang) if verbose else c
