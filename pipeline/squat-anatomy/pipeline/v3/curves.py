import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/base.py').read())
CV=META['curves']; NS=len(META['S'])
CVP=ARR['cv_pos'].astype(float); CVQ=ARR['cv_quat'].astype(float)
offs=[]; o=0
for c in CV: offs.append(o); o+=NS*c['n']
def curve_pts(ci):
    n=CV[ci]['n']; o=offs[ci]; P=CVP[(o)*3:(o+NS*n)*3].reshape(NS,n,3)*5e-5; P=P.copy(); P[:,:,1]+=0.8
    Q=CVQ[o*4:(o+NS*n)*4].reshape(NS,n,4); Q=Q/np.linalg.norm(Q,axis=2,keepdims=True); return P,Q
BODIES=['pelvis_rest','L5','L4','L3','L2','L1','thorax','femur_r','patella_r','tibia_r','talus_r']
def local_coords(P, body):
    # P: (NS, n, 3) world -> body-local for each frame (body frames are rest-world -> world maps)
    out=np.zeros_like(P)
    for i in range(NS):
        o,R=frame(i,body); out[i]=(P[i]-o)@R
    return out
