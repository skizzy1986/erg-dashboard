import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
exec(open(ROOT+'v3/isb.py').read().split("if __name__=='__main__':")[0])
GRIP_Z=0.40
def mc3z(C): return tpts(C['hand']@Tcur[13],MC3_0).mean(0)[2]
def cost3(x,verbose=False):
    C=transforms(x); g=gaps(C); parts={}
    parts['pen']=sum(1e4*np.sum(np.maximum(0,MARG[p]-g[p])**2) for p in HP)
    sn=0
    for f,(mc,p1,p2,p3) in CH.items():
        sn+=3e3*(min(g[p1].min(),g[p2].min())-MARG[p1])**2+3e3*(g[p3].min()-MARG[p3])**2+2e3*(g[mc].min()-0.009)**2
    sn+=1e3*(min(g[28].min(),g[29].min())-MARG[28])**2; parts['snug']=sn
    dev,fl,_=wrist_angles(C)
    parts['wrist']=3e2*(max(0,np.radians(abs(dev)-6))**2 + max(0,np.radians(fl-5))**2 + max(0,np.radians(-fl-15))**2) + 2*np.radians(fl)**2 + 2*np.radians(dev)**2
    a=isb_angles(C['hum']@Tcur[0]); ef=elbow_flex(C)
    lim =max(0,np.radians(a['er']-90))**2 + max(0,np.radians(-a['er']))**2
    lim+=max(0,np.radians(a['elev']-65))**2 + max(0,np.radians(25-a['elev']))**2
    lim+=max(0,np.radians(ef-135))**2 + max(0,np.radians(-a['plane']-45))**2 + max(0,np.radians(a['plane']-10))**2
    parts['limits']=3e3*lim
    gh,ec,_,_=hframe(C['hum']@Tcur[0]); v=ec-gh; ang=np.degrees(np.arccos(np.clip(-v[1]/norm(v),-1,1)))
    parts['elbow_down']=50*max(0,np.radians(ang-50))**2
    parts['grip']=5e2*(mc3z(C)-GRIP_Z)**2
    parts['reg']=0.004*np.sum((x/SIG)**2)
    c=sum(parts.values())
    return (c,parts,dict(dev=dev,fl=fl,elev=a['elev'],er=a['er'],plane=a['plane'],elbow=ef,z=mc3z(C))) if verbose else c
