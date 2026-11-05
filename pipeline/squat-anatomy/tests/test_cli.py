import pytest

from squat.cli import main
from squat.stages import STAGES


def test_list(capsys):
    assert main(['list']) == 0
    out = capsys.readouterr().out
    rows = {line.split()[0]: line.split() for line in out.splitlines() if line.split() and line.split()[0] in STAGES}
    assert set(rows) == set(STAGES)
    for name, s in STAGES.items():
        assert s.runtime_s in rows[name]
        assert rows[name][-1] == ('yes' if s.ci else 'no')
    assert {n for n, r in rows.items() if r[-1] == 'no'} == {'ik3', 'ik4', 'regcur'}
    assert 'v3/base.html' in out


def test_unknown_stage_is_usage_error():
    with pytest.raises(SystemExit) as e:
        main(['stage', 'nope'])
    assert e.value.code == 2


def test_verify_rejects_non_page(tmp_path, capsys):
    p = tmp_path / 'x.html'
    p.write_text('<html></html>', encoding='utf-8')
    assert main(['verify', str(p)]) == 1
    assert 'not a built squat page' in capsys.readouterr().err
