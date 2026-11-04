import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# Quasi-static sagittal kinetics on the model (de Leva 1996 BSP), used for the vertical-bar-path rebalance and as the base for the phase model.
exec(open(ROOT+'v3/armik3.py').read())
exec(open(SP+'v3/extra_readouts.py').read())
exec(open(SP+'v3/balance.py').read())
BW=85.0; MBAR=100.0; g=9.81; MT=BW+MBAR
DL={'head':.0694,'trunk':.4346,'ua':.0271,'fa':.0162,'hand':.0061,'thigh':.1416,'shank':.0433,'foot':.0137}
M={k:v*BW for k,v in DL.items()}
# ---- thorax-frame landmarks (rest)
Pt,pidt,bmt=bone('thorax'); _n=bmt['names']
c7=Pt[pidt==_n.index('Seventh cervical vertebra')]; CERV=c7[np.argmin(c7[:,0])]
skull=Pt[np.isin(pidt,[_n.index(n) for n in ['Frontal bone','Occipital bone']])]
VERT=np.array([skull[:,0].mean(), max(skull[:,1].max(), Pr[pidr==30][:,1].max()), 0.0])
def arm_landmarks(PA):
    hum=PA[pidr==0]; rad=PA[pidr==2]; uln=PA[pidr==1]
    ghc=None
    return hum, rad, uln
def arm_points(x):
    C=transforms(x); H,gh,ec=hum_frame(C['hum']@Tcur[0])
    rs=tpts(C['rad']@Tcur[2],RS_[None])[0]; us=tpts(C['uln']@Tcur[1],US_[None])[0]; wr=(rs+us)/2
    mc=tpts(C['hand']@Tcur[13],MC3_0); mcp3=mc[np.argmin(MC3_0[:,2])]
    return gh,ec,wr,mcp3
# ---- pelvis L5/S1 (rest) as in v2
Ps_,pids_,bms_=bone('pelvis'); mid_s=Ps_[np.abs(Ps_[:,2])<0.015]; top=mid_s[mid_s[:,1]>np.percentile(mid_s[:,1],96)]
L5S1_REST=np.array([np.median(top[:,0]), np.median(top[:,1]), 0.0])
Pa_,_,_=bone('talus_r')
def world(i,body,p,F): o,R=frame(i,body,F); return o+R@p
def segs(i,F,armx):
    gh,ec,wr,mcp3=arm_points(armx)
    o,R=frame(i,'thorax',F); W=lambda p:o+R@p
    hipR=frame(i,'femur_r',F)[0]; hipM=hipR.copy(); hipM[2]=0
    kn=world(i,'femur_r',EPI,F); an=frame(i,'talus_r',F)[0]
    heel=HEEL; toe=TOE2
    cerv=W(CERV); vert=W(VERT)
    d={}
    d['bar']=(MBAR, W(BAR_C))
    d['head']=(M['head'], vert+0.5976*(cerv-vert))
    d['trunk']=(M['trunk'], cerv+0.4486*(hipM-cerv))
    ua=gh+0.5772*(ec-gh); fa=ec+0.4574*(wr-ec); hn=wr+0.79*(mcp3-wr)
    for k,p in [('ua',ua),('fa',fa),('hand',hn)]:
        q=W(p); q[2]=0; d[k]=(2*M[k], q)                       # both arms (mirror) projected to the sagittal plane
    d['thigh']=(2*M['thigh'], hipR+0.4095*(kn-hipR))
    d['shank']=(2*M['shank'], kn+0.4459*(an-kn))
    d['foot']=(2*M['foot'], heel+0.4415*(toe-heel))
    l5=world(i,'pelvis_rest',L5S1_REST,F)
    gh_w=W(gh); gh_w[2]=0
    return d, dict(hip=hipR, kn=kn, an=an, l5=l5, gh=gh_w, hipM=hipM)
UPPER=('bar','head','trunk','ua','fa','hand')
def kinetics(i,F,armx):
    d,J=segs(i,F,armx)
    mx=sum(m*p[0] for m,p in d.values()); com_x=mx/MT
    xs=lambda keys:sum(d[k][0]*d[k][1][0] for k in keys); ms=lambda keys:sum(d[k][0] for k in keys)
    hip=J['hip'][0]; kn=J['kn'][0]; an=J['an'][0]
    Mhip=g/2*(xs(UPPER)-ms(UPPER)*hip)
    Mknee=g/2*(ms(UPPER)*kn-xs(UPPER)) + g/2*(ms(['thigh'])*kn-xs(['thigh']))
    Mank=g/2*(xs(UPPER+('thigh','shank'))-ms(UPPER+('thigh','shank'))*an)
    # L5/S1: everything above it (trunk above L5/S1 ~ trunk minus de Leva lower-trunk 11.17% BW)
    l5=J['l5']; m_lpt=0.1117*BW; trunkC=d['trunk'][1]
    lptC=l5+0.5*(J['hipM']-l5)                                  # lower-trunk/pelvis mass centred between L5/S1 and the hips
    upC=(d['trunk'][0]*trunkC - m_lpt*lptC)/(d['trunk'][0]-m_lpt)
    above=[(MBAR,d['bar'][1]),(d['head'][0],d['head'][1]),(d['trunk'][0]-m_lpt,upC)]+[(d[k][0],d[k][1]) for k in ('ua','fa','hand')]
    Mlum=g*sum(m*(p[0]-l5[0]) for m,p in above)
    v=J['gh']-J['hipM']; lean=np.degrees(np.arctan2(v[0],v[1]))
    shear=None
    return dict(com_x=com_x, Mhip=Mhip, Mknee=Mknee, Mank=Mank, Mlum=Mlum, lean=lean, bar=d['bar'][1], l5=l5)
