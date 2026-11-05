import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/kin3.py').read())
import json
X3=np.load(SP+'v3/armik4_x.npy')
RO=META['readout']
# 1) check the model reproduces v2 values with v2 frames
for i in [0,20,40]:
    k=kinetics(i,FR,X3); r=RO[i]
    print(i,'v2: Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f lean %.1f bar %.1f | recomputed: Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f lean %.1f  com_x-midfoot %.1f mm'%(
        r['Mhip'],r['Mknee'],r['Mank'],r['Mlum'],r['lean'],r['bar'],k['Mhip'],k['Mknee'],k['Mank'],k['Mlum'],k['lean'],1000*(k['com_x']-COP[0])))
# 2) vertical bar path: rotate trunk chain about the hip so the bar is over midfoot in every frame
deltas=[];hips=[]
for i in range(NS):
    d,h=solve_delta(i,FR); deltas.append(d); hips.append(h)
deltas=np.array(deltas); Fn=apply_frames(FR,deltas,hips)
np.save(SP+'v3/deltas3.npy',deltas); np.save(SP+'v3/frames3.npy',Fn); np.save(SP+'v3/hips3.npy',np.array(hips))
HEELX=META['heel'][0]; TIPX=META['tip'][0]; FL=TIPX-HEELX
rows=[]
for i in range(NS):
    k=kinetics(i,Fn,X3); r=RO[i]; lord,klat,shin=extra(i,Fn)
    rows.append(dict(i=i,S=META['S'][i],delta=np.degrees(deltas[i]),hip=r['hip']-np.degrees(deltas[i]),knee=r['knee'],ankle=r['ankle'],lumbar=r['lumbar'],depth=r['depth'],
        lean=k['lean'],bar=1000*(k['bar'][0]-COP[0]),bx=[float(k['bar'][0]),float(k['bar'][1]),0.0],cop=100*(k['com_x']-HEELX)/FL,
        Mhip=k['Mhip'],Mknee=k['Mknee'],Mank=k['Mank'],Mlum=k['Mlum'],lord=lord,klat=100*klat,shin=shin))
for r in rows[::5]+[rows[-1]]:
    print('S %.2f d %+.2f | hip %.1f knee %.1f ank %.1f lean %.1f shin %.1f lumbar %.1f lord %.1f depth %.1f | bar %.1f mm cop %.1f%% | Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f | klat %.1f cm'%(
        r['S'],r['delta'],r['hip'],r['knee'],r['ankle'],r['lean'],r['shin'],r['lumbar'],r['lord'],r['depth'],r['bar'],r['cop'],r['Mhip'],r['Mknee'],r['Mank'],r['Mlum'],r['klat']))
import pickle; pickle.dump(rows,open(SP+'v3/rows3.pkl','wb'))
print('heel x',HEELX,'tip x',TIPX,'midfoot (COP target) at %.1f%%'%(100*(COP[0]-HEELX)/FL))
