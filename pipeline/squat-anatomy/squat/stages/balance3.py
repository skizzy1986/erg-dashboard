"""Vertical bar path + quasi-static kinetics per depth (was pipeline/v3/balance3.py)."""
from dataclasses import dataclass

import numpy as np

from squat.stages._io import cache, out_path, save_pickle

OUTPUTS = ('deltas3.npy', 'frames3.npy', 'hips3.npy', 'rows3.pkl')


@dataclass(frozen=True, eq=False)
class Result:
    deltas: np.ndarray
    frames: np.ndarray
    hips: np.ndarray
    rows: list


def compute(ctx, X3, log=print):
    META=ctx.base.meta; FR=ctx.base.fr; NS=ctx.curves.ns; COP=ctx.curves.cop
    kinetics=ctx.kin.kinetics; solve_delta=ctx.curves.solve_delta; apply_frames=ctx.curves.apply_frames; extra=ctx.readouts.extra
    RO=META['readout']
    # 1) check the model reproduces v2 values with v2 frames
    for i in [0,20,40]:
        k=kinetics(i,FR,X3); r=RO[i]
        log(i,'v2: Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f lean %.1f bar %.1f | recomputed: Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f lean %.1f  com_x-midfoot %.1f mm'%(
            r['Mhip'],r['Mknee'],r['Mank'],r['Mlum'],r['lean'],r['bar'],k['Mhip'],k['Mknee'],k['Mank'],k['Mlum'],k['lean'],1000*(k['com_x']-COP[0])))
    # 2) vertical bar path: rotate trunk chain about the hip so the bar is over midfoot in every frame
    deltas=[];hips=[]
    for i in range(NS):
        d,h=solve_delta(i,FR); deltas.append(d); hips.append(h)
    deltas=np.array(deltas); Fn=apply_frames(FR,deltas,hips)
    HEELX=META['heel'][0]; TIPX=META['tip'][0]; FL=TIPX-HEELX
    rows=[]
    for i in range(NS):
        k=kinetics(i,Fn,X3); r=RO[i]; lord,klat,shin=extra(i,Fn)
        rows.append(dict(i=i,S=META['S'][i],delta=np.degrees(deltas[i]),hip=r['hip']-np.degrees(deltas[i]),knee=r['knee'],ankle=r['ankle'],lumbar=r['lumbar'],depth=r['depth'],
            lean=k['lean'],bar=1000*(k['bar'][0]-COP[0]),bx=[float(k['bar'][0]),float(k['bar'][1]),0.0],cop=100*(k['com_x']-HEELX)/FL,
            Mhip=k['Mhip'],Mknee=k['Mknee'],Mank=k['Mank'],Mlum=k['Mlum'],lord=lord,klat=100*klat,shin=shin))
    for r in rows[::5]+[rows[-1]]:
        log('S %.2f d %+.2f | hip %.1f knee %.1f ank %.1f lean %.1f shin %.1f lumbar %.1f lord %.1f depth %.1f | bar %.1f mm cop %.1f%% | Mhip %.1f Mknee %.1f Mank %.1f Mlum %.1f | klat %.1f cm'%(
            r['S'],r['delta'],r['hip'],r['knee'],r['ankle'],r['lean'],r['shin'],r['lumbar'],r['lord'],r['depth'],r['bar'],r['cop'],r['Mhip'],r['Mknee'],r['Mank'],r['Mlum'],r['klat']))
    log('heel x',HEELX,'tip x',TIPX,'midfoot (COP target) at %.1f%%'%(100*(COP[0]-HEELX)/FL))
    return Result(deltas=deltas, frames=Fn, hips=np.array(hips), rows=rows)


def run(ctx, in_dir, out_dir, log=print):
    X3=np.load(cache(ctx, in_dir, 'armik4_x.npy'))
    r=compute(ctx, X3, log)
    out={n: out_path(out_dir, n) for n in OUTPUTS}
    np.save(out['deltas3.npy'],r.deltas); np.save(out['frames3.npy'],r.frames); np.save(out['hips3.npy'],r.hips)
    save_pickle(r.rows, out['rows3.pkl'])
    return out
