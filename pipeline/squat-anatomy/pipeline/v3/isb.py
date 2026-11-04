import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
# ISB (Wu et al. 2005) humerothoracic angles: thorax frame from IJ/PX/C7/T8, humerus frame from GH/EM/EL, YXY decomposition
exec(open(ROOT+'v3/armik2.py').read())
Pt_t,pid_t,bm_t=bone('thorax'); _n=bm_t['names']
def _pts(name): return Pt_t[pid_t==_n.index(name)]
_man=_pts('Manubrium'); _xi=_pts('Xiphoid process'); _c7=_pts('Seventh cervical vertebra'); _t8=_pts('Eighth thoracic vertebra')
def _mid(P): return P[np.abs(P[:,2])<0.006]
IJ=_mid(_man)[np.argmax(_mid(_man)[:,1])]; PX=_mid(_xi)[np.argmin(_mid(_xi)[:,1])]; C7=_mid(_c7)[np.argmin(_mid(_c7)[:,0])]; T8=_mid(_t8)[np.argmin(_mid(_t8)[:,0])]
_yt=(IJ+C7)/2-(PX+T8)/2; _yt[2]=0; _yt/=norm(_yt)          # model is mirror-symmetric: keep the thorax frame in the sagittal plane
_zt=np.array([0,0,1.]); _xt=np.cross(_yt,_zt); _xt/=norm(_xt)
TF=np.c_[_xt,_yt,_zt]
def hum_frame(Th):
    gh=tpts(Th,GH0[None])[0]; em=tpts(Th,EPI_M[None])[0]; el=tpts(Th,EPI_L[None])[0]; ec=(em+el)/2
    y=gh-ec; y/=norm(y); x=np.cross(y, el-em); x/=norm(x)       # anterior (right arm: y up, el lateral -> y x (el-em) points forward)
    z=np.cross(x,y); return np.c_[x,y,z], gh, ec
def isb_angles(Th):
    H,gh,ec=hum_frame(Th); R=TF.T@H
    a,b,g=Rot.from_matrix(R).as_euler('YXY',degrees=True)
    p=a+180; e=-b; ax=g-180
    w=lambda t:(t+180)%360-180
    return dict(plane=w(p), elev=-e, er=-w(ax))
if __name__=='__main__':
    print('thorax axes (cols x,y,z):'); print(TF.round(3))
    print('IJ',IJ.round(3),'PX',PX.round(3),'C7',C7.round(3),'T8',T8.round(3))
    # sanity: hanging rest arm
    print('rest humerus:',{k:round(v,1) for k,v in isb_angles(np.eye(4)@Tcur[0]@np.linalg.inv(Tcur[0])@TG).items()})
    for nm_,x in [('original (no retraction)',None),('x=0 with retraction',np.zeros(NV)),('armik2',np.load(SP+'v3/armik2_x.npy'))]:
        C=transforms(np.zeros(NV)) if x is None else transforms(x)
        if x is None: C={k:np.eye(4) for k in C}
        a=isb_angles(C['hum']@Tcur[0]); el,tw,pl,_,_=shoulder_angles(C['hum']@Tcur[0])
        print(nm_,{k:round(v,1) for k,v in a.items()},' swing-twist er %.1f plane %.1f  -> er+plane %.1f'%(-tw,pl,-tw+pl),' elbow %.1f'%elbow_flex(C),
              ' MC3 z %.3f'%tpts(C['hand']@Tcur[13],MC3_0).mean(0)[2], ' wrist dev/fl %.1f %.1f'%wrist_angles(C)[:2])
