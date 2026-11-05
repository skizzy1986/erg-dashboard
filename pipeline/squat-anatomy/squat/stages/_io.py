"""Reading caches and writing stage outputs, with the pinned serialisation settings."""
import pickle
from pathlib import Path

# which stage writes each cache, for the "missing cache" hint
PRODUCER = {
    'deltas3.npy': 'balance3', 'frames3.npy': 'balance3', 'hips3.npy': 'balance3', 'rows3.pkl': 'balance3',
    'mlen3.pkl': 'lengths3', 'phase3.npz': 'phase3', 'upper3.npz': 'upper3',
    'armik3_x.npy': 'ik3', 'armik4_x.npy': 'ik4',
}

PICKLE_PROTOCOL = 4  # what Python 3.13's default wrote into the committed caches; pinned so 3.14's default (5) cannot move them


def cache(ctx, in_dir, name):
    hint = f'regenerate it with python -m squat stage {PRODUCER[name]}' if name in PRODUCER else None
    return ctx.paths.require(name, 'cache', root=in_dir, hint=hint)


def load_pickle(path):
    with open(path, 'rb') as fh:
        return pickle.load(fh)


def save_pickle(obj, path):
    with open(path, 'wb') as fh:
        pickle.dump(obj, fh, protocol=PICKLE_PROTOCOL)


def out_path(out_dir, name):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / name


def quiet(*_args, **_kw):
    pass
