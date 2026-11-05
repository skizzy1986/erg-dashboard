import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/armik.py').read())
H0v=load_bp('FMA23130').vertices; _top=H0v[H0v[:,2]>H0v[:,2].max()-35]
_A=np.c_[2*_top,np.ones(len(_top))]; _b=(_top**2).sum(1); _cc,*_=np.linalg.lstsq(_A,_b,rcond=None); GH0=_cc[:3]
def hframe(Th):
    gh=tpts(Th,GH0[None])[0]; em=tpts(Th,EPI_M[None])[0]; el=tpts(Th,EPI_L[None])[0]; ec=(em+el)/2
    y=gh-ec; y/=norm(y); z=el-em; z-=(z@y)*y; z/=norm(z); return gh,ec,y,z
_gh0,_ec0,Y0,Z0=hframe(TG)
def shoulder_angles(Th):
    gh,ec,y,z=hframe(Th)
    elev=np.degrees(np.arccos(np.clip(-y@np.array([0,-1,0]),-1,1)))         # 0 = arm hanging straight down
    # swing rest long axis Y0 onto y, then twist = angle between swung Z0 and z about y  (+ = external for right arm)
    ax=np.cross(Y0,y); s=norm(ax); c=Y0@y
    Rs=np.eye(3) if s<1e-9 else Rot.from_rotvec(ax/s*np.arctan2(s,c)).as_matrix()
    z0=Rs@Z0; tw=np.degrees(np.arctan2(np.cross(z0,z)@y, z0@z))
    v=ec-gh; plane=np.degrees(np.arctan2(v[0],v[2]))     # 0 = pure abduction (lateral), + = elbow forward, - = elbow behind
    return elev, tw, plane, gh, ec
def elbow_flex(C):
    gh,ec,_,_=hframe(C['hum']@Tcur[0])
    rs=tpts(C['rad']@Tcur[2],RS_[None])[0]; us=tpts(C['uln']@Tcur[1],US_[None])[0]; wr=(rs+us)/2
    a=ec-gh; b=wr-ec; return np.degrees(np.arccos(np.clip(a@b/norm(a)/norm(b),-1,1)))
def cost2(x,verbose=False):
    C=transforms(x); g=gaps(C); parts={}
    parts['pen']=sum(1e4*np.sum(np.maximum(0,MARG[p]-g[p])**2) for p in HP)
    sn=0
    for f,(mc,p1,p2,p3) in CH.items():
        sn+=3e3*(min(g[p1].min(),g[p2].min())-MARG[p1])**2+3e3*(g[p3].min()-MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
    sn+=1e3*(min(g[28].min(),g[29].min())-MARG[28])**2; parts['snug']=sn
    dev,fl,_=wrist_angles(C)
    parts['wrist']=3e2*(max(0,np.radians(abs(dev)-8))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-20))**2)
    elev,tw,plane,gh,ec=shoulder_angles(C['hum']@Tcur[0]); ef=elbow_flex(C)
    lim=0
    er=-tw                                                                   # + = external rotation (right arm)
    lim+=max(0,np.radians(er-90))**2 + max(0,np.radians(-er-10))**2           # external rotation <= 90 deg
    lim+=max(0,np.radians(elev-60))**2 + max(0,np.radians(25-elev))**2
    lim+=max(0,np.radians(ef-135))**2 + max(0,np.radians(-plane-35))**2 + max(0,np.radians(plane-10))**2
    parts['limits']=3e3*lim
    v=ec-gh; ang=np.degrees(np.arccos(np.clip(-v[1]/norm(v),-1,1)))
    parts['elbow_down']=50*max(0,np.radians(ang-50))**2
    parts['reg']=0.004*np.sum((x/SIG)**2)
    c=sum(parts.values())
    return (c,parts,dict(dev=dev,fl=fl,elev=elev,er=-tw,plane=plane,elbow=ef)) if verbose else c
