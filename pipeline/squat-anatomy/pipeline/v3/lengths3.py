import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# Musculotendon path length per curve-skinned muscle across depth (after the trunk re-balance), as % of standing length.
exec(open(ROOT+'v3/balance.py').read())
import collections, pickle
deltas=np.load(SP+'v3/deltas3.npy'); hips=list(np.load(SP+'v3/hips3.npy'))
al=fixed_alpha()
def curve_len(ci):
    P,Q=curve_pts(ci); a=al[ci]; n=CV[ci]['n']
    if np.any(a>0):
        for i in range(NS):
            Rv=Rot.from_rotvec(np.c_[np.zeros(n),np.zeros(n),a*deltas[i]]); P[i]=Rv.apply(P[i]-hips[i])+hips[i]
    return np.linalg.norm(np.diff(P,axis=1),axis=2).sum(1)
CL=np.array([curve_len(ci) for ci in range(len(CV))])          # (ncurves, NS)
mid=ARR['cm_mid']; c1=ARR['cm_c1']; c2=ARR['cm_c2']; w=ARR['cm_w']/255.
W=collections.defaultdict(lambda: collections.Counter())
for m,a_,b_,ww in zip(mid,c1,c2,w): W[int(m)][int(a_)]+=ww; W[int(m)][int(b_)]+=1-ww
ML={}
for m,cnt in W.items():
    tot=sum(cnt.values()); L=sum(v*CL[c] for c,v in cnt.items())/tot
    ML[m]=100*L/L[0]
pickle.dump(ML,open(SP+'v3/mlen3.pkl','wb'))
MN=[x['name'] for x in META['muscles']]
for m in sorted(ML):
    L=ML[m]; sl=np.gradient(L,np.array(META['S']))
    print('%-34s bottom %6.1f%%  min %6.1f max %6.1f   slope@0.5 %+6.1f  slope@0.95 %+6.1f'%(MN[m],L[-1],L.min(),L.max(),sl[20],sl[38]))
