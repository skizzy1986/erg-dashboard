"""python -m squat build | stage <name> | list | verify HTML

Exit codes: 0 ok, 1 verify mismatch, 2 usage, 3 missing fixed input or cache, 4 missing STL.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

from squat.paths import MissingInputError, Paths, display

GOLDEN_RAW_BYTES = 3_450_003
GOLDEN_RAW_SHA256 = 'eb15d943be022632eb6a799d53c41b27d857ece4cc21f842d7a9c7b6bc93b6be'

EXIT_MISMATCH, EXIT_MISSING, EXIT_STL = 1, 3, 4


def _parser():
    p = argparse.ArgumentParser(prog='python -m squat', description=__doc__.split('\n\n')[0])
    sub = p.add_subparsers(dest='cmd', required=True)
    b = sub.add_parser('build', help='rebuild the page from the cached stage outputs')
    b.add_argument('--out', type=Path, help='default: dist/squat.html')
    b.add_argument('--template', type=Path, help='default: page/* assembled in memory')
    b.add_argument('--caches', type=Path, help='default: pipeline/v3')
    s = sub.add_parser('stage', help='regenerate one stage output')
    s.add_argument('name')
    s.add_argument('--in-dir', type=Path, help='where to read caches (default: pipeline/v3)')
    s.add_argument('--out-dir', type=Path, help='where to write outputs (default: pipeline/v3)')
    sub.add_parser('list', help='list stages and fixed inputs')
    v = sub.add_parser('verify', help='check a built page against the golden data and the shipped manifest')
    v.add_argument('html', type=Path)
    return p


def _build(args, paths):
    from squat.build import build
    from squat.context import Context
    from squat.page import assemble_template
    template = args.template.read_text(encoding='utf-8') if args.template else assemble_template(paths.page)
    res = build(Context(paths), args.caches or paths.v3, template, args.out or paths.dist / 'squat.html')
    print(f'out {display(res.out)}\nraw_bytes {res.raw_bytes}\nraw_sha256 {res.raw_sha256}')
    return 0


def _stage(args, paths, parser):
    from squat.context import Context
    from squat.stages import STAGES
    if args.name not in STAGES:
        parser.error(f'unknown stage {args.name!r}; choose from {", ".join(STAGES)}')
    out = STAGES[args.name].fn(Context(paths), args.in_dir or paths.v3, args.out_dir or paths.v3)
    for p in out.values():
        print('wrote', display(p))
    return 0


def _list(paths):
    from squat.inputs import FIXED_INPUTS, FIXED_NOTES
    from squat.stages import STAGES
    rows = [('stage', 'inputs', 'outputs', 'STLs', 'runtime_s', 'ci')]
    for s in STAGES.values():
        rows.append((s.name, ', '.join(s.inputs), ', '.join(s.outputs), s.stls, s.runtime_s, 'yes' if s.ci else 'no'))
    w = [max(len(r[i]) for r in rows) for i in range(len(rows[0]))]
    for r in rows:
        print('  '.join(c.ljust(w[i]) for i, c in enumerate(r)).rstrip())
    print('\nfixed inputs (no generator in this repo; under', display(paths.data) + '):')
    for rel, sha in FIXED_INPUTS.items():
        note = FIXED_NOTES.get(rel)
        print(f'  {rel:22} {sha[:12]}…' + (f'  {note}' if note else ''))
    return 0


def _verify(args, paths):
    from squat.build import decode_html
    if not args.html.is_file():
        print(f'squat: no such file {args.html}', file=sys.stderr)
        return EXIT_MISMATCH
    try:
        man, raw = decode_html(args.html)
    except (AttributeError, ValueError, OSError, EOFError) as e:  # no script tags, bad base64/gzip/JSON/UTF-8
        print(f'squat: {args.html} is not a built squat page ({type(e).__name__})', file=sys.stderr)
        return EXIT_MISMATCH
    sha = hashlib.sha256(raw).hexdigest()
    shipped = json.loads(paths.shipped_manifest.read_text(encoding='utf-8'))
    ok_data = len(raw) == GOLDEN_RAW_BYTES and sha == GOLDEN_RAW_SHA256
    ok_man = man == shipped
    print(f'raw_bytes {len(raw)} (golden {GOLDEN_RAW_BYTES})\nraw_sha256 {sha}\n'
          f'data {"ok" if ok_data else "MISMATCH"}; manifest vs {display(paths.shipped_manifest)} '
          f'{"ok" if ok_man else "MISMATCH"}')
    return 0 if ok_data and ok_man else EXIT_MISMATCH


def main(argv=None):
    parser = _parser()
    args = parser.parse_args(argv)
    paths = Paths.from_env()
    try:
        if args.cmd == 'build':
            return _build(args, paths)
        if args.cmd == 'stage':
            return _stage(args, paths, parser)
        if args.cmd == 'list':
            return _list(paths)
        return _verify(args, paths)
    except MissingInputError as e:
        print(f'squat: {e}', file=sys.stderr)
        return EXIT_STL if e.kind == 'stl' else EXIT_MISSING
