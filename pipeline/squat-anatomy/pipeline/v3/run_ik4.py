import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/armik3.py').read())
import time
TH0=HV[29].mean(0)
def thumb_ang(C):
    c=tpts(bone_T(C,29),HV[29]).mean(0); return np.degrees(np.arctan2(c[1]-BAR[1],c[0]-BAR[0]))
def cost4(x,verbose=False):
    r=cost3(x,verbose)
    a=thumb_ang(transforms(x)); t=50*(max(0,np.radians(a-0))**2+max(0,np.radians(-70-a))**2)
    if verbose: c,parts,info=r; parts['thumb']=t; info['thumb']=a; return c+t,parts,info
    return r+t
x3=np.load(SP+'v3/armik3_x.npy'); t0=time.time()
s1=x3.copy(); s1[19:21]=0
s2=x3.copy(); s2[19:21]=np.radians([-30,-30])
s3=x3.copy(); s3[19:21]=np.radians([30,30])
best=None
for k,s0 in enumerate([s1,s2,s3,x3]):
    r=minimize(cost4,s0,method='L-BFGS-B',options={'maxiter':1500})
    c,parts,info=cost4(r.x,True)
    print(k,'cost %.4f'%r.fun,{kk:round(float(v),3 if kk=='z' else 1) for kk,v in info.items()},flush=True)
    if best is None or r.fun<best.fun: best=r
x=best.x; c,parts,info=cost4(x,True)
print('BEST cost %.4f'%c,{k:round(float(v),4) for k,v in parts.items()})
print('angles:',{k:round(float(v),3 if k=='z' else 1) for k,v in info.items()})
g=gaps(transforms(x)); print('min gaps mm:',[round(1000*g[p].min(),1) for p in [11,12,13,14,15,16,19,22,25,18,21,24,27,28,29]])
print('time %.0fs'%(time.time()-t0)); np.save(SP+'v3/armik4_x.npy',x)
