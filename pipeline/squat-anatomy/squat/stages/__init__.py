"""Stage registry: what each stage reads and writes, what it costs, and whether CI runs it."""
from dataclasses import dataclass
from typing import Callable

from squat.inputs import STL_BUILD, STL_UPPER
from squat.stages import balance3, ik3, ik4, lengths3, phase3, regcur, upper3

ARM_INPUTS = ('Tcur', 'girdle_p', 'bar_seat')


@dataclass(frozen=True)
class Stage:
    name: str
    fn: Callable
    inputs: tuple
    outputs: tuple
    stls: str
    runtime_s: str
    ci: bool


def _build_run(ctx, in_dir, out_dir, log=print):
    from squat.build import build
    from squat.page import assemble_template
    res = build(ctx, in_dir, assemble_template(ctx.paths.page), out_dir / 'squat.html', log=log)
    return {'squat.html': res.out}


STAGES = {s.name: s for s in [
    Stage('balance3', balance3.run, ('base', 'armik4_x', 'curve_*') + ARM_INPUTS, balance3.OUTPUTS,
          f'{len(STL_BUILD)} build', '1.1', True),
    Stage('lengths3', lengths3.run, ('base', 'deltas3', 'hips3', 'curve_alpha', 'curve_ends'), lengths3.OUTPUTS,
          'none', '0.8', True),
    Stage('phase3', phase3.run, ('base', 'rows3', 'frames3', 'deltas3', 'hips3', 'armik4_x') + ARM_INPUTS,
          phase3.OUTPUTS, f'{len(STL_BUILD)} build', '1.0', True),
    Stage('upper3', upper3.run, ('base', 'armik4_x', 'st_W') + ARM_INPUTS, upper3.OUTPUTS,
          f'{len(STL_BUILD)} + {len(STL_UPPER)}', '2.0', True),
    Stage('ik3', ik3.run, ('armik2_x',) + ARM_INPUTS, ik3.OUTPUTS, f'{len(STL_BUILD)} build', '~195', False),
    Stage('ik4', ik4.run, ('armik3_x',) + ARM_INPUTS, ik4.OUTPUTS, f'{len(STL_BUILD)} build', '~195', False),
    Stage('regcur', regcur.run, ('base', 'T_arm_all (preserve bundle)'), regcur.OUTPUTS, '32 (BONE_FID)', '?', False),
    Stage('build', _build_run, ('every cache', 'base', 'template'), ('squat.html',), f'{len(STL_BUILD)} build',
          '1.4', True),
]}
