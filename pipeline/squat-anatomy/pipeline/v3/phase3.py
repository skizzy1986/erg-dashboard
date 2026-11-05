import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# Phase-resolved rep model: timeline, vertical dynamics, dynamic moments, muscle-tendon lengths, contraction modes, phase-specific activation.
exec(open(ROOT+'v3/kin3.py').read())
import pickle, json
from scipy.ndimage import gaussian_filter1d
rows=pickle.load(open(SP+'v3/rows3.pkl','rb')); Fn=np.load(SP+'v3/frames3.npy'); deltas=np.load(SP+'v3/deltas3.npy'); hips=list(np.load(SP+'v3/hips3.npy'))
X4=np.load(SP+'v3/armik4_x.npy')
S=np.array(META['S'])
# ---- system COM height per depth
comy=[]
for i in range(NS):
    d,J=segs(i,Fn,X4); comy.append(sum(m*p[1] for m,p in d.values())/MT)
comy=np.array(comy); bary=np.array([r['bx'][1] for r in rows])
D=bary[0]-bary[-1]; print('bar travel %.3f m, COM travel %.3f m'%(D,comy[0]-comy[-1]))
for k in range(1,len(bary)): bary[k]=min(bary[k],bary[k-1]-1e-5)     # top frames: <1 mm rise from the trunk re-balance; keep monotonic
assert np.all(np.diff(bary)<0)
# ---- rep timeline (reference rep: 100 kg ~80% 1RM, controlled eccentric, touch-and-go, MCV ~0.67 m/s per Sanchez-Medina 2017)
DT=0.002; T_BR,T_L=0.6,0.6
def softmin(a,b,k=0.04): return -k*np.log(np.exp(-a/k)+np.exp(-b/k))
def t_of_h(vh,hh):                                     # time to travel along h with speed v(h)
    dt=np.diff(hh)/(0.5*(vh[1:]+vh[:-1])); return np.r_[0,np.cumsum(dt)]
hh=np.linspace(0,D,4001)
# eccentric (h measured from the top: x = D-h): accelerate down (unweighting), cruise, brake into the bottom
x=D-hh
ve_h=softmin(np.sqrt(2*1.6*np.maximum(x,0)+1e-6),softmin(np.full_like(x,0.47),np.sqrt(2*0.9*np.maximum(hh,0)+1e-6)))
# concentric: drive out of the hole, mild sticking region ~10-22 cm above the bottom, decelerate to lockout
vc_h=softmin(np.sqrt(2*4.2*hh+1e-6),softmin(np.full_like(hh,1.12),np.sqrt(2*2.9*np.maximum(D-hh,0)+1e-6)))
vc_h*=1-0.32*np.exp(-((hh-0.175)/0.055)**2)
te=t_of_h(ve_h[::-1],hh[::-1]*-1+D)                   # time along x from the top
tc=t_of_h(vc_h,hh)
T_E=te[-1]; T_C=tc[-1]
tg_e=np.arange(0,T_E,DT); h_e=D-np.interp(tg_e,te,(D-hh[::-1]))
tg_c=np.arange(0,T_C,DT); h_c=np.interp(tg_c,tc,hh)
h=np.r_[np.full(int(T_BR/DT),D),h_e,h_c,np.full(int(T_L/DT),D)]
h=gaussian_filter1d(h,0.03/DT); t=np.arange(len(h))*DT
v=np.gradient(h,DT)
h=np.clip(h,0,D)
s_t=np.interp(-h,-(bary-bary[-1]),S)                     # depth parameter from bar height (bary decreasing)
a=np.gradient(v,DT)
yc=np.interp(s_t,S,comy); ac=np.gradient(np.gradient(yc,DT),DT); ac=gaussian_filter1d(ac,0.02/DT)
f=1+ac/9.81
i_bot=int(np.argmin(h)); t_bot=t[i_bot]
# phases: 0 brace, 1 eccentric, 2 transition (bar within 2 cm of the bottom), 3 concentric, 4 lockout
ph=np.zeros(len(t),int); moving=np.abs(v)>0.004
first=np.argmax(moving); last=len(t)-1-np.argmax(moving[::-1])
ph[first:i_bot]=1; ph[i_bot:last+1]=3; ph[last+1:]=4
ph[(h<0.02)&(np.arange(len(t))>=first)&(np.arange(len(t))<=last)]=2
# sticking region: first local max of concentric velocity -> following local min
ci=np.arange(i_bot,last); vv=v[ci]
mx=[k for k in range(1,len(vv)-1) if vv[k]>=vv[k-1] and vv[k]>vv[k+1]]; mn=[k for k in range(1,len(vv)-1) if vv[k]<=vv[k-1] and vv[k]<vv[k+1]]
st0=ci[mx[0]] if mx else None; st1=ci[[k for k in mn if mx and k>mx[0]][0]] if (mx and mn) else None
ecc_dur=t[i_bot]-t[first]; con_dur=t[last]-t[i_bot]
tr_idx=np.where(ph==2)[0]
print('eccentric %.2fs  concentric %.2fs  transition %.2fs'%(ecc_dur,con_dur,(tr_idx[-1]-tr_idx[0])*DT))
print('MCV %.2f m/s  peak con v %.2f  peak ecc v %.2f'%(D/con_dur, v.max(), -v.min()))
print('GRF factor: min %.2f max %.2f at t=%.2f (bottom t=%.2f)'%(f.min(),f.max(),t[np.argmax(f)],t_bot))
if st0 is not None and st1 is not None:
    print('sticking region: v_max1 %.2f m/s at h=%.0f cm (t+%.2fs) -> v_min %.2f at h=%.0f cm (t+%.2fs)'%(v[st0],100*h[st0],t[st0]-t_bot,v[st1],100*h[st1],t[st1]-t_bot))
# ---- per-depth phase tables (descent / ascent): GRF factor and bar velocity at each depth
def per_depth(mask):
    idx=np.where(mask)[0]; ss=s_t[idx]; o=np.argsort(ss)
    return np.interp(S,ss[o],f[idx][o]), np.interp(S,ss[o],v[idx][o])
fd,vd=per_depth((ph==1)|((ph==2)&(np.arange(len(t))<=i_bot)))
fa,va=per_depth((ph==3)|((ph==2)&(np.arange(len(t))>=i_bot)))
fd[-1]=fa[-1]=f[i_bot]; vd[-1]=va[-1]=0
for k in [0,10,20,30,36,38,40]: print('S %.2f  f_desc %.3f f_asc %.3f  v_desc %.2f v_asc %.2f'%(S[k],fd[k],fa[k],vd[k],va[k]))
np.savez(SP+'v3/phase3.npz',t=t,v=v,h=h,s=s_t,f=f,ph=ph,fd=fd,fa=fa,vd=vd,va=va,comy=comy,i_bot=i_bot,st0=-1 if st0 is None else st0,st1=-1 if st1 is None else st1)
