import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/base.py').read())
from scipy.optimize import minimize
TC=np.load(SP+'v3/Tcur.npy'); IDX=list(range(30))+[37,38]; Tcur={p:TC[i] for i,p in enumerate(IDX)}
nm=bmr['names']
SCA=Pr[pidr==37]; CLA=Pr[pidr==38]; HUM=Pr[pidr==0]
RIBS=Pr[(pidr>=39)&(pidr<=58)]; RTREE=cKDTree(RIBS)
SC=CLA[np.argsort(CLA[:,2])[:15]].mean(0)                       # sternoclavicular joint
AC=CLA[np.argsort(-CLA[:,2])[:15]].mean(0)                      # acromioclavicular joint
GH=np.array([-0.0843,1.4726,0.1759])
# costal-surface points of the scapula: those facing the ribs (closest 35% by distance)
d0_all,_=RTREE.query(SCA); costal=SCA[d0_all<np.percentile(d0_all,35)]; d0,_=RTREE.query(costal)
MB=SCA[SCA[:,2]<SCA[:,2].min()+0.012]                          # medial border points
INF=SCA[np.argmin(SCA[:,1])]
def girdle(p):
    # p: [retraction deg, depression deg, scap rot about y at AC, scap rot about x at AC, scap rot about z at AC]
    Rsc=rot_about([0,1,0],np.radians(-p[0]),SC)@rot_about([1,0,0],np.radians(p[1]),SC)
    acn=tpts(Rsc,AC[None])[0]
    Rac=rot_about([0,1,0],np.radians(p[2]),acn)@rot_about([1,0,0],np.radians(p[3]),acn)@rot_about([0,0,1],np.radians(p[4]),acn)
    return Rsc, Rac@Rsc
