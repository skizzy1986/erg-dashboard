import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# Assemble the v3 page: new arm/upper body, vertical bar path frames + curves, phase-resolved readouts, timeline, activation.
import sys
exec(open(ROOT+'v3/kin3.py').read())
exec(open(SP+'v3/act3.py').read())
exec(open(SP+'v3/apply3.py').read().split("if __name__")[0])
import pickle
rows=pickle.load(open(SP+'v3/rows3.pkl','rb')); P3=np.load(SP+'v3/phase3.npz'); MLEN=pickle.load(open(SP+'v3/mlen3.pkl','rb'))
deltas=np.load(SP+'v3/deltas3.npy'); hips=list(np.load(SP+'v3/hips3.npy')); Fn=np.load(SP+'v3/frames3.npy')
TEMPLATE=sys.argv[1] if len(sys.argv)>1 else None; OUT=sys.argv[2] if len(sys.argv)>2 else SP+'v3/test_build.html'
html,man,arrs=load(SP+'v3/base.html'); meta=man['meta']
if TEMPLATE: html=open(TEMPLATE,encoding='utf-8').read()
# ---- geometry
apply_upper3(man,arrs)
arrs['frames']=Fn.astype(np.float32)
cvp,cvq=corrected_curves(deltas,hips); arrs['cv_pos']=cvp; arrs['cv_quat']=cvq
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
X4=np.load(SP+'v3/armik4_x.npy'); C4=transforms(X4); A4=isb_angles(C4['hum']@Tcur[0]); dev4,fl4,_=wrist_angles(C4)
meta['arm']=dict(er=r2(A4['er'],1),elev=r2(A4['elev'],1),plane=r2(A4['plane'],1),elbow=r2(elbow_flex(C4),1),wrist=r2(max(abs(dev4),abs(fl4)),1),
    grip=r2(200*tpts(C4['hand']@Tcur[13],MC3_0).mean(0)[2],0),retraction=12)
print('arm',meta['arm'])
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
print('sticking end S=%.3f'%s_end)
out,trend=activation_tables3(meta,rows,P3['fd'],fa_eff,MLEN)
names=[m['name'] for m in meta['muscles']]
st_mid=set(int(x) for x in np.unique(arrs['st_mid'])); lb_mid=set(int(x) for x in np.unique(arrs['lb_mid'])); sa_mid=set(int(x) for x in np.unique(arrs['sa_mid']))
for k,m in enumerate(meta['muscles']):
    n=m['name']
    if n in out['desc']:
        m['act']=[[int(round(255*float(v))) for v in out['desc'][n]],[int(round(255*float(v))) for v in out['asc'][n]]]
    elif m['act'] is not None and k in st_mid:
        base=m['act'][1][0]/255.0
        m['act']=[[int(round(255*min(1,base*0.95*(0.85+0.15*fv)))) for fv in P3['fd']],[int(round(255*min(1,base*(0.85+0.15*fv)))) for fv in P3['fa']]]
    if k in MLEN and n not in NOLEN:
        m['len']=[r2(x,1) for x in MLEN[k]]; m['mode']=int(trend[n][0]) if n in trend else 0
    elif k in lb_mid or k in sa_mid: m['mode']='brace'
    elif k in st_mid: m['mode']='hold'
    else: m['mode']='stab'
save(html,man,arrs,OUT); print('written',OUT, 'rep',{k:v for k,v in meta['rep'].items() if k not in ('s','ph','v','f')})
