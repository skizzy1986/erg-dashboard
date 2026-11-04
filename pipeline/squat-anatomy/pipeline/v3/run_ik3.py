import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/armik3.py').read())
import time
x2=np.load(SP+'v3/armik2_x.npy'); rs=np.random.RandomState(7); t0=time.time()
starts=[x2,np.zeros(NV),0.5*x2]+[np.r_[x2[:7]+np.radians(rs.uniform(-15,15,7)),x2[7:]] for _ in range(3)]
best=None
for k,s0 in enumerate(starts):
    r=minimize(cost3,s0,method='L-BFGS-B',options={'maxiter':1500})
    c,parts,info=cost3(r.x,True)
    print(k,'cost %.4f'%r.fun,{kk:round(float(v),3 if kk=='z' else 1) for kk,v in info.items()},flush=True)
    if best is None or r.fun<best.fun: best=r
x=best.x; c,parts,info=cost3(x,True)
print('BEST cost %.4f'%c,{k:round(float(v),4) for k,v in parts.items()})
print('angles:',{k:round(float(v),3 if k=='z' else 1) for k,v in info.items()})
g=gaps(transforms(x)); print('min gaps mm:',[round(1000*g[p].min(),1) for p in [11,12,13,14,15,16,19,22,25,18,21,24,27,28,29]])
print('time %.0fs'%(time.time()-t0)); np.save(SP+'v3/armik3_x.npy',x)
