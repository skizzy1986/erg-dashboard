import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# v3 base: decode the CURRENT published page (stage3) and set up helpers
import json, base64, gzip, re, sys, numpy as np
from numpy.linalg import norm
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation as Rot
import trimesh
SP=ROOT
exec(open(SP+'repack.py').read())
HTML,MAN,ARR=load(SP+'v3/base.html')
META=MAN['meta']; FN=META['frames']; FR=ARR['frames'].astype(float)
def qR(q): return Rot.from_quat(q).as_matrix()
def frame(i,n,F=None):
    F=FR if F is None else F; j=FN.index(n); return F[i,j,:3].copy(), qR(F[i,j,3:])
def bone(g, arr=None):
    bm=META['bones'][g]; a=ARR if arr is None else arr
    return a[f'bone_{g}_pos'].astype(float)*bm['s']+np.array(bm['c']), a[f'bone_{g}_id'], bm
def tpts(M,P): return (M[:3,:3]@P.T).T+M[:3,3]
def inv(M): Mi=np.eye(4); Mi[:3,:3]=np.linalg.inv(M[:3,:3]); Mi[:3,3]=-Mi[:3,:3]@M[:3,3]; return Mi
def rot_about(axis, ang, point):
    M=np.eye(4); R=Rot.from_rotvec(np.asarray(axis)/np.linalg.norm(axis)*ang).as_matrix(); M[:3,:3]=R; M[:3,3]=point-R@point; return M
def screw(M):
    R=M[:3,:3]/np.cbrt(np.linalg.det(M[:3,:3])); t=M[:3,3]; rv=Rot.from_matrix(R).as_rotvec(); ang=np.linalg.norm(rv); a=rv/ang
    p,*_=np.linalg.lstsq(np.eye(3)-R, t-(a@t)*a, rcond=None); return a, ang, p
Pr,pidr,bmr=bone('thoraxR'); Ir=ARR['bone_thoraxR_idx'].reshape(-1,3)
B0=np.array([[0,-1,0],[0,0,1],[-1,0,0]],float)
def load_bp(fid): return trimesh.load(SP+f'ext/stl/{fid}.stl')
TG=np.load(SP+'T_global.npy')
BONE_FID={0:'FMA23130',1:'FMA23467',2:'FMA23464',3:'FMA24435',4:'FMA24437',5:'FMA24439',6:'FMA24441',7:'FMA24443',8:'FMA23725',9:'FMA24446',10:'FMA24448',
 11:'FMA24464',12:'FMA24466',13:'FMA24468',14:'FMA24470',15:'FMA24472',16:'FMA24451',17:'FMA24455',18:'FMA24460',19:'FMA24452',20:'FMA24456',21:'FMA24461',
 22:'FMA24453',23:'FMA24457',24:'FMA24462',25:'FMA24454',26:'FMA24458',27:'FMA24463',28:'FMA24450',29:'FMA24459',37:'FMA13395',38:'FMA13322'}
