import os
if 'ROOT' not in globals(): ROOT = os.environ.get('SQUAT_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) + '/'
import numpy as np
SP=ROOT
exec(open(SP+'repack.py').read())
def bar_push(S, mids, names, bar, r, min_gap=0.0006):
    # push soft-tissue vertices that intrude into the bar radially out of it (hand tendons around the grip)
    d=np.hypot(S[:,0]-bar[0],S[:,1]-bar[1]); bad=d<r+min_gap
    if bad.any():
        u=(S[bad,:2]-bar[:2])/d[bad,None]; S[bad,:2]=bar[:2]+u*(r+min_gap)
    return int(bad.sum())
def apply_upper3(man, arrs, npz=SP+'v3/upper3.npz'):
    d=np.load(npz); meta=man['meta']
    q,c,s=quant(d['P']); arrs['bone_thoraxR_pos']=q; meta['bones']['thoraxR']['c']=c; meta['bones']['thoraxR']['s']=s
    S=d['S'].copy(); n=bar_push(S, d['SM'], None, np.array(meta['bar']['c'][:2]), meta['bar']['r'])
    q,c,s=quant(S); arrs['st_pos']=q; man['st_meta']['c']=c; man['st_meta']['s']=s; man['st_meta']['nv']=int(len(S))
    arrs['st_idx']=d['SI'].reshape(-1).astype(np.uint16); arrs['st_mid']=d['SM'].astype(np.uint8); arrs['st_tw']=d['STW'].astype(np.uint8)
    q,c,s=quant(d['L']); arrs['lb_pos']=q; meta['lbs']['c']=c; meta['lbs']['s']=s
    return n
if __name__=='__main__':
    import sys
    html,man,arrs=load(SP+'v3/base.html'); n=apply_upper3(man,arrs); save(html,man,arrs,SP+'v3/test3.html'); print('ok, pushed',n,'verts out of the bar')
