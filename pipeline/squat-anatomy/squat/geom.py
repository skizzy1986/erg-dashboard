"""Pure rigid-body helpers (was the function half of pipeline/v3/base.py)."""
import numpy as np
from scipy.spatial.transform import Rotation as Rot


def qR(q): return Rot.from_quat(q).as_matrix()


def tpts(M,P): return (M[:3,:3]@P.T).T+M[:3,3]


def inv(M): Mi=np.eye(4); Mi[:3,:3]=np.linalg.inv(M[:3,:3]); Mi[:3,3]=-Mi[:3,:3]@M[:3,3]; return Mi


def rot_about(axis, ang, point):
    M=np.eye(4); R=Rot.from_rotvec(np.asarray(axis)/np.linalg.norm(axis)*ang).as_matrix(); M[:3,:3]=R; M[:3,3]=point-R@point; return M


def screw(M):
    R=M[:3,:3]/np.cbrt(np.linalg.det(M[:3,:3])); t=M[:3,3]; rv=Rot.from_matrix(R).as_rotvec(); ang=np.linalg.norm(rv); a=rv/ang
    p,*_=np.linalg.lstsq(np.eye(3)-R, t-(a@t)*a, rcond=None); return a, ang, p


def Rof(M): return M[:3,:3]/np.cbrt(np.linalg.det(M[:3,:3]))


# thoraxR part id -> BodyParts3D FMA id (regcur re-registers each of these bones)
BONE_FID={0:'FMA23130',1:'FMA23467',2:'FMA23464',3:'FMA24435',4:'FMA24437',5:'FMA24439',6:'FMA24441',7:'FMA24443',8:'FMA23725',9:'FMA24446',10:'FMA24448',
 11:'FMA24464',12:'FMA24466',13:'FMA24468',14:'FMA24470',15:'FMA24472',16:'FMA24451',17:'FMA24455',18:'FMA24460',19:'FMA24452',20:'FMA24456',21:'FMA24461',
 22:'FMA24453',23:'FMA24457',24:'FMA24462',25:'FMA24454',26:'FMA24458',27:'FMA24463',28:'FMA24450',29:'FMA24459',37:'FMA13395',38:'FMA13322'}
