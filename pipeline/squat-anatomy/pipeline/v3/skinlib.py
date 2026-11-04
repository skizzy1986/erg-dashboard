import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/girdle.py').read())
import scipy.sparse as sps
# --- bone point sets in current posed space (thorax-rest frame) for proximity weights
Pt_,pidt_,bmt_=bone('thorax')
THX=np.vstack([Pr[(pidr>=30)&(pidr<=36)], Pr[(pidr>=39)&(pidr<=58)], Pt_[Pt_[:,2]>-0.03]])
GROUPS={'thx':THX,'cla':Pr[pidr==38],'sca':Pr[pidr==37],'hum':Pr[pidr==0],'uln':Pr[pidr==1],'rad':Pr[pidr==2],
        'hand':Pr[(pidr>=3)&(pidr<=15)]}
for p in range(16,30): GROUPS[f'ph{p}']=Pr[pidr==p]
GK=list(GROUPS.keys()); GT={k:cKDTree(v) for k,v in GROUPS.items()}
def prox_weights(V, keys=GK, sig=0.004):
    D=np.stack([GT[k].query(V)[0] for k in keys],1)
    W=np.exp(-(D-D.min(1,keepdims=True))/sig); W[W<0.02]=0; return W/W.sum(1,keepdims=True)
def adjacency(F,n):
    e=np.vstack([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]); e=np.vstack([e,e[:,::-1]])
    A=sps.coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(n,n)).tocsr(); A.data[:]=1; d=np.asarray(A.sum(1)).ravel(); d[d==0]=1; return A,d
def smooth(W,A,d,it=4):
    for _ in range(it): W=0.5*W+0.5*(A@W)/d[:,None]
    return W
def skin(V, W, C, keys=GK):
    out=np.zeros_like(V)
    for j,k in enumerate(keys):
        m=W[:,j]>1e-5
        if m.any(): out[m]+=W[m,j,None]*tpts(C[k],V[m])
    return out
def group_of_pid(p):
    if p==0: return 'hum'
    if p==1: return 'uln'
    if p==2: return 'rad'
    if 3<=p<=15: return 'hand'
    if 16<=p<=29: return f'ph{p}'
    if p==37: return 'sca'
    if p==38: return 'cla'
    return 'thx'
