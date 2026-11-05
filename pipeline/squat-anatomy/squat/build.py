"""Assemble the page: upper body, vertical-bar-path frames + curves, readouts, timeline, activation
(was pipeline/v3/build3.py + apply3.py:6-19)."""
import base64
import gzip
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from squat.geom import tpts
from squat.model.activation import NOLEN, activation_tables3
from squat.model.curves import fixed_alpha
from squat.model.kinetics import BW, MBAR
from squat.repack import quant, save
from squat.stages._io import cache, load_pickle


@dataclass(frozen=True)
class BuildResult:
    out: Path
    raw_bytes: int
    raw_sha256: str


def bar_push(S, mids, names, bar, r, min_gap=0.0006):
    # push soft-tissue vertices that intrude into the bar radially out of it (hand tendons around the grip)
    d=np.hypot(S[:,0]-bar[0],S[:,1]-bar[1]); bad=d<r+min_gap
    if bad.any():
        u=(S[bad,:2]-bar[:2])/d[bad,None]; S[bad,:2]=bar[:2]+u*(r+min_gap)
    return int(bad.sum())


def apply_upper3(man, arrs, upper):
    d=upper; meta=man['meta']
    q,c,s=quant(d['P']); arrs['bone_thoraxR_pos']=q; meta['bones']['thoraxR']['c']=c; meta['bones']['thoraxR']['s']=s
    S=d['S'].copy(); n=bar_push(S, d['SM'], None, np.array(meta['bar']['c'][:2]), meta['bar']['r'])
    q,c,s=quant(S); arrs['st_pos']=q; man['st_meta']['c']=c; man['st_meta']['s']=s; man['st_meta']['nv']=int(len(S))
    arrs['st_idx']=d['SI'].reshape(-1).astype(np.uint16); arrs['st_mid']=d['SM'].astype(np.uint8); arrs['st_tw']=d['STW'].astype(np.uint8)
    q,c,s=quant(d['L']); arrs['lb_pos']=q; meta['lbs']['c']=c; meta['lbs']['s']=s
    return n


def decode_html(path):
    """The parsed manifest and the decompressed data blob of a built page."""
    html = Path(path).read_text(encoding='utf-8')
    man = json.loads(re.search(r'<script id="squat-manifest" type="application/json">(.*?)</script>', html, re.S).group(1))
    b64 = re.search(r'<script id="squat-data" type="application/octet-stream">(.*?)</script>', html, re.S).group(1).strip()
    return man, gzip.decompress(base64.b64decode(b64))


def build(ctx, caches, template, out, log=print):
    caches = Path(caches); out = Path(out)
    rows=load_pickle(cache(ctx, caches, 'rows3.pkl')); P3=np.load(cache(ctx, caches, 'phase3.npz')); MLEN=load_pickle(cache(ctx, caches, 'mlen3.pkl'))
    deltas=np.load(cache(ctx, caches, 'deltas3.npy')); hips=list(np.load(cache(ctx, caches, 'hips3.npy'))); Fn=np.load(cache(ctx, caches, 'frames3.npy'))
    upper=np.load(cache(ctx, caches, 'upper3.npz')); X4=np.load(cache(ctx, caches, 'armik4_x.npy'))
    alpha=fixed_alpha(ctx.paths)
    base=ctx.base; arm=ctx.arm; kin=ctx.kin; curves=ctx.curves
    frame=base.frame; world=kin.world; EPI=ctx.readouts.epi; Tcur=arm.Tcur
    html,man,arrs=base.fresh_copy(); meta=man['meta']
    if template is not None: html=template
    # ---- geometry
    apply_upper3(man,arrs,upper)
    arrs['frames']=Fn.astype(np.float32)
    cvp,cvq=curves.corrected_curves(deltas,hips,alpha); arrs['cv_pos']=cvp; arrs['cv_quat']=cvq
    # ---- per-depth readouts
    S=np.array(meta['S']); r2=lambda x,n=2: round(float(x),n)
    RO=[]
    for i,r in enumerate(rows):
        hip=frame(i,'femur_r',Fn)[0]; kn=world(i,'femur_r',EPI,Fn)
        thigh=np.degrees(np.arctan2(kn[1]-hip[1],kn[0]-hip[0]))          # + = knee higher than hip (thigh below parallel)
        RO.append(dict(knee=r2(r['knee']),hip=r2(r['hip']),ankle=r2(r['ankle']),lean=r2(r['lean']),lumbar=r2(r['lumbar']),depth=r2(r['depth']),
            bar=r2(r['bar'],1),bx=[r2(r['bx'][0],4),r2(r['bx'][1],4),0],cop=r2(r['cop'],1),lord=r2(r['lord']),klat=r2(r['klat'],2),shin=r2(r['shin']),thigh=r2(thigh),
            Mhip=r2(r['Mhip'],1),Mknee=r2(r['Mknee'],1),Mank=r2(r['Mank'],1),Mlum=r2(r['Mlum'],1)))
    meta['readout']=RO
    meta['bw']=BW; meta['mbar']=MBAR
    C4=arm.transforms(X4); A4=arm.isb_angles(C4['hum']@Tcur[0]); dev4,fl4,_=arm.wrist_angles(C4)
    meta['arm']=dict(er=r2(A4['er'],1),elev=r2(A4['elev'],1),plane=r2(A4['plane'],1),elbow=r2(arm.elbow_flex(C4),1),wrist=r2(max(abs(dev4),abs(fl4)),1),
        grip=r2(200*tpts(C4['hand']@Tcur[13],arm.MC3_0).mean(0)[2],0),retraction=12)
    log('arm',meta['arm'])
    # ---- phase model
    t=P3['t']; step=10                                                   # 2 ms -> 20 ms
    meta['rep']=dict(dt=0.02,s=[r2(x,4) for x in P3['s'][::step]],ph=[int(x) for x in P3['ph'][::step]],v=[r2(x,3) for x in P3['v'][::step]],f=[r2(x,3) for x in P3['f'][::step]])
    ph=P3['ph']; ib=int(P3['i_bot']); first=int(np.argmax(ph==1)); lastc=int(np.where(ph==3)[0].max()); tr=np.where(ph==2)[0]
    st0,st1=int(P3['st0']),int(P3['st1'])
    meta['rep'].update(t_bottom=r2(t[ib]),t_start=r2(t[first]),t_end=r2(t[lastc]),ecc=r2(t[ib]-t[first]),con=r2(t[lastc]-t[ib]),trans=r2(t[tr[-1]]-t[tr[0]]),
        mcv=r2(P3['h'].max()/(t[lastc]-t[ib]),2),vpk=r2(P3['v'].max()),vecc=r2(-P3['v'].min()),fpk=r2(P3['f'].max()),fmin=r2(P3['f'].min()),D=r2(P3['h'].max(),3),
        st=[r2(t[st0]),r2(t[st1]),r2(P3['h'][st0],3),r2(P3['h'][st1],3)] if st0>0 and st1>0 else None)
    meta['pd']=dict(fd=[r2(x,3) for x in P3['fd']],fa=[r2(x,3) for x in P3['fa']],vd=[r2(x,3) for x in P3['vd']],va=[r2(x,3) for x in P3['va']])
    # ---- activation + contraction mode + length
    hS=np.array([r['bx'][1] for r in rows]); hS=hS-hS[-1]
    s_end=float(np.interp(0.22,hS[::-1],S[::-1]))                      # depth parameter where the sticking region ends (22 cm above the bottom)
    fa=P3['fa'].copy(); rm=np.maximum.accumulate(fa[::-1])[::-1]         # running max from the bottom upward
    w=np.clip((S-(s_end-0.06))/0.06,0,1); fa_eff=fa*(1-w)+rm*w
    log('sticking end S=%.3f'%s_end)
    out_,trend=activation_tables3(meta,rows,P3['fd'],fa_eff,MLEN)
    st_mid=set(int(x) for x in np.unique(arrs['st_mid'])); lb_mid=set(int(x) for x in np.unique(arrs['lb_mid'])); sa_mid=set(int(x) for x in np.unique(arrs['sa_mid']))
    for k,m in enumerate(meta['muscles']):
        n=m['name']
        if n in out_['desc']:
            m['act']=[[int(round(255*float(v))) for v in out_['desc'][n]],[int(round(255*float(v))) for v in out_['asc'][n]]]
        elif m['act'] is not None and k in st_mid:
            base_=m['act'][1][0]/255.0
            m['act']=[[int(round(255*min(1,base_*0.95*(0.85+0.15*fv)))) for fv in P3['fd']],[int(round(255*min(1,base_*(0.85+0.15*fv)))) for fv in P3['fa']]]
        if k in MLEN and n not in NOLEN:
            m['len']=[r2(x,1) for x in MLEN[k]]; m['mode']=int(trend[n][0]) if n in trend else 0
        elif k in lb_mid or k in sa_mid: m['mode']='brace'
        elif k in st_mid: m['mode']='hold'
        else: m['mode']='stab'
    out.parent.mkdir(parents=True, exist_ok=True)
    save(html,man,arrs,out); log('written',out, 'rep',{k:v for k,v in meta['rep'].items() if k not in ('s','ph','v','f')})
    _, raw = decode_html(out)
    return BuildResult(out=out, raw_bytes=len(raw), raw_sha256=hashlib.sha256(raw).hexdigest())
