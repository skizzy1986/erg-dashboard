"""Apply the arm solution to bones, st muscles (corrective DQS) and the lb set; rebuild deltoid + pec major
from the rest STLs with DQS (was pipeline/v3/upper3.py)."""
from dataclasses import dataclass, fields

import fast_simplification
import numpy as np
import scipy.sparse as sps
import trimesh
from numpy.linalg import norm
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

from squat.geom import inv, tpts
from squat.model.dqs import dqs
from squat.model.skin import adjacency, group_of_pid, smooth
from squat.stages._io import cache, out_path

OUTPUTS = ('upper3.npz',)


@dataclass(frozen=True, eq=False)
class Result:
    # field order is the np.savez keyword order
    P: np.ndarray
    S: np.ndarray
    SI: np.ndarray
    SM: np.ndarray
    STW: np.ndarray
    L: np.ndarray


def compute(ctx, x, st_W, log=print):
    base=ctx.base; arm=ctx.arm; skin=ctx.skin; stl=ctx.stl
    META=base.meta; MAN=base.man; ARR=base.arr; Pr=base.pr; pidr=base.pidr; bmr=base.bmr; TG=base.tg
    Tcur=arm.Tcur; GK=skin.gk; BAR=arm.BAR; RB=arm.RB
    C=arm.transforms(x)
    for k in GK: C.setdefault(k,np.eye(4))
    # ---- bones
    P_new=Pr.copy()
    for p in list(range(30))+[37,38]:
        m=pidr==p; P_new[m]=tpts(C[group_of_pid(p)],Pr[m])
    # ---- st muscles: corrective DQS from the current pose
    st=MAN['st_meta']; S=ARR['st_pos'].astype(float)*st['s']+np.array(st['c']); W=st_W
    S_new=dqs(S,W,[C[k] for k in GK])
    SI=ARR['st_idx'].reshape(-1,3).astype(np.int64); SM=ARR['st_mid'].copy(); STW=ARR['st_tw'].copy()
    # ---- lb set (latissimus etc.)
    lbm=META['lbs']; L=ARR['lb_pos'].astype(float)*lbm['s']+np.array(lbm['c']); LI=ARR['lb_idx'].reshape(-1,3).astype(np.int64)
    WL=skin.prox_weights(L); Al,dl=adjacency(LI,len(L)); WL=smooth(WL,Al,dl,4); WL/=WL.sum(1,keepdims=True)
    L_new=dqs(L,WL,[C[k] for k in GK])
    # ---- rebuild deltoid + pectoralis major from the rest STL
    REST={'cla':tpts(TG,stl.vertices('FMA13322')),'sca':tpts(TG,stl.vertices('FMA13395')),'hum':tpts(TG,stl.vertices('FMA23130'))}
    Pt_t,pid_t,bm_t=base.bone('thorax'); stern=Pt_t[np.isin(pid_t,[bm_t['names'].index(n) for n in ['Body of sternum','Manubrium','Xiphoid process']])]
    REST['thx']=np.vstack([Pr[(pidr>=39)&(pidr<=58)],stern])
    RT={k:cKDTree(v) for k,v in REST.items()}
    MT={'thx':np.eye(4),'cla':C['cla']@Tcur[38]@inv(TG),'sca':C['sca']@Tcur[37]@inv(TG),'hum':C['hum']@Tcur[0]@inv(TG)}
    REB={'Deltoid (clavicular part)':('FMA34680','cla','delt'),'Deltoid (acromial part)':('FMA34682','sca','delt'),'Deltoid (spinal part)':('FMA34684','sca','delt'),
         'Pectoralis major (clavicular part)':('FMA34690','cla','pec'),'Pectoralis major (sternocostal part)':('FMA79979','thx','pec'),'Pectoralis major (abdominal part)':('FMA45874','thx','pec')}
    MN=[m['name'] for m in META['muscles']]
    def ss(a,b,t): u=np.clip((t-a)/(b-a),0,1); return u*u*(3-2*u)
    def graph(V,F):
        e=np.vstack([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]); w=norm(V[e[:,0]]-V[e[:,1]],axis=1)
        G=sps.coo_matrix((np.r_[w,w],(np.r_[e[:,0],e[:,1]],np.r_[e[:,1],e[:,0]])),shape=(len(V),len(V))).tocsr(); return G
    info={}
    new_parts=[]
    # REB order is load-bearing: the sternocostal part sets SC_FIELD/SC_NEW/SC_F, the abdominal part (next) reads them
    SC_FIELD=SC_NEW=SC_F=None
    for name,(fid,og,kind) in REB.items():
        mi=MN.index(name); n_old=int((SM==mi).sum())
        tm=stl.mesh(fid); V0=tpts(TG,np.asarray(tm.vertices)); F0=np.asarray(tm.faces)
        target=int(n_old*1.5); red=max(0.0,1-target/len(V0))
        V,F=fast_simplification.simplify(V0.astype(np.float32),F0.astype(np.int32),target_reduction=red); V=V.astype(float); F=F.astype(np.int64)
        G=graph(V,F)
        dh,_=RT['hum'].query(V)
        if kind=='delt':
            ins=(dh<0.005)&(V[:,1]<V[:,1].min()+0.28*(V[:,1].max()-V[:,1].min()))
        else:
            ins=dh<0.005
        if ins.sum()<5: ins=dh<=np.percentile(dh,3)
        do_,_=RT[og].query(V); ori=do_<0.005
        if name=='Pectoralis major (abdominal part)' or ori.sum()<5:
            di_=dijkstra(G,indices=np.where(ins)[0],min_only=True); ori=di_>=np.percentile(di_[np.isfinite(di_)],94)
        d_o=dijkstra(G,indices=np.where(ori)[0],min_only=True); d_i=dijkstra(G,indices=np.where(ins)[0],min_only=True)
        big=np.nanmax(np.r_[d_o[np.isfinite(d_o)],d_i[np.isfinite(d_i)]]); d_o[~np.isfinite(d_o)]=big; d_i[~np.isfinite(d_i)]=big
        t=d_o/(d_o+d_i+1e-9)
        w=ss(0.12,0.62,t) if kind=='delt' else ss(0.55,0.95,t)
        if name=='Pectoralis major (abdominal part)':
            # thin inferior slip: borrow the deformation field of the adjacent sternocostal part so the layers stay in order
            Vsc,wsc,tsc=SC_FIELD; dd,ii=cKDTree(Vsc).query(V,k=8); ww=1/(dd+1e-4); ww/=ww.sum(1,keepdims=True)
            w=(ww*wsc[ii]).sum(1); t=(ww*tsc[ii]).sum(1)
        Vn=dqs(V,np.c_[1-w,w],[MT[og],MT['hum']])
        if name=='Pectoralis major (abdominal part)':
            Vn=V+(ww[:,:,None]*(SC_NEW[ii]-Vsc[ii])).sum(1)          # wrap: follow the sternocostal surface displacement
            # the abdominal slip runs deep to the sternocostal fibres near the axilla: tuck any part lying on top of them underneath
            tsc_=trimesh.Trimesh(SC_NEW,SC_F,process=False); cp,dist,fi=trimesh.proximity.closest_point(tsc_,Vn)
            nrm=tsc_.face_normals[fi]; out=((Vn-cp)*nrm).sum(1)>0; tuck=out&(dist<0.02)
            Vn[tuck]=cp[tuck]-nrm[tuck]*0.004; log('   tucked',int(tuck.sum()),'of',len(Vn),'abdominal-slip verts')
        if name=='Pectoralis major (sternocostal part)': SC_FIELD=(V.copy(),w.copy(),t.copy()); SC_NEW=Vn.copy(); SC_F=F.copy()
        tw=(0.55*ss(0.90,1.0,t) if kind=='delt' else ss(0.80,0.97,t))
        new_parts.append((mi,Vn,F,np.round(255*tw).astype(np.uint8)))
        info[name]=dict(n_old=n_old,n_new=len(V),n_ori=int(ori.sum()),n_ins=int(ins.sum()))
    log(info)
    # splice into st arrays
    keep=~np.isin(SM,[p[0] for p in new_parts])
    remap=-np.ones(len(SM),np.int64); remap[keep]=np.arange(keep.sum())
    fk=keep[SI].all(1); SI2=remap[SI[fk]]
    Ps=[S_new[keep]]; Is=[SI2]; Ms=[SM[keep]]; Ts=[STW[keep]]; off=keep.sum()
    for mi,Vn,F,tw in new_parts:
        Ps.append(Vn); Is.append(F+off); Ms.append(np.full(len(Vn),mi,np.uint8)); Ts.append(tw); off+=len(Vn)
    S_out=np.vstack(Ps); I_out=np.vstack(Is); M_out=np.concatenate(Ms); T_out=np.concatenate(Ts)
    log('st verts',len(S),'->',len(S_out),' faces',len(SI),'->',len(I_out))
    # clearance vs bar
    def gap(Q): return np.hypot(Q[:,0]-BAR[0],Q[:,1]-BAR[1])-RB
    g=gap(S_out)
    for k in sorted(set(M_out[g<0.002].tolist())): log('   st near/inside bar:',MN[k],'%.1f mm'%(1000*g[M_out==k].min()))
    gp=gap(P_new); log('   bones within 4mm of bar:',sorted(set(bmr['names'][p] for p in pidr[gp<0.004])))
    log('   lb min gap %.1f mm'%(1000*gap(L_new).min()))
    return Result(P=P_new,S=S_out,SI=I_out,SM=M_out,STW=T_out,L=L_new)


def run(ctx, in_dir, out_dir, log=print):
    x=np.load(cache(ctx, in_dir, 'armik4_x.npy')); st_W=np.load(ctx.paths.require('v3/st_W.npy', 'fixed'))
    r=compute(ctx, x, st_W, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    np.savez(out['upper3.npz'],**{fl.name: getattr(r, fl.name) for fl in fields(r)})
    return out
