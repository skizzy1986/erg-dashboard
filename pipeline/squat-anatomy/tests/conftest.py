import os

import pytest

from squat.context import Context
from squat.inputs import STL_BUILD
from squat.paths import Paths
from squat.stages._io import quiet


@pytest.fixture(scope='session')
def paths():
    return Paths.from_env()


@pytest.fixture(scope='session')
def ctx(paths):
    return Context(paths)


@pytest.fixture(scope='session')
def strict():
    """In CI a missing STL is a failure, not a skip: a skipped golden test would pass the job."""
    return os.environ.get('SQUAT_STRICT_STL') == '1' or os.environ.get('CI') == 'true'


@pytest.fixture(scope='session')
def need_stl(paths, strict):
    def check(ids=STL_BUILD):
        missing = [i for i in ids if not (paths.stl / f'{i}.stl').is_file()]
        if missing:
            msg = f'BodyParts3D STLs missing: {", ".join(missing)} — run scripts/fetch_stl.sh'
            pytest.fail(msg) if strict else pytest.skip(msg)
    return check


@pytest.fixture
def out_dir(tmp_path):
    return tmp_path / 'out'


@pytest.fixture(scope='session')
def built(ctx, paths, need_stl, tmp_path_factory):
    """One build from the committed caches, shared by test_golden and test_numbers."""
    from squat.build import build
    from squat.page import assemble_template
    need_stl()
    out = tmp_path_factory.mktemp('golden') / 'squat.html'
    return build(ctx, paths.v3, assemble_template(paths.page), out, log=quiet)
