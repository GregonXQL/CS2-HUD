from app.core.team_manager import TeamManager
from app.models.teams import TeamSettings
from tools.gsi_simulator import payload


def test_learning_and_swap():
    manager = TeamManager(TeamSettings(a_name='Alpha'))
    manager.update(payload('warmup'))
    assert manager.counts() == {'A': 0, 'B': 0}
    manager.update(payload())
    assert manager.counts() == {'A': 5, 'B': 5}
    manager.update(payload('halftime_swap'))
    assert manager.settings.a_side == 'T'
    assert manager.settings.a_name == 'Alpha'
    manager.update(payload('spectator_off'))
    assert manager.settings.a_side == 'T'


def test_legacy_settings_and_substitution():
    manager = TeamManager(TeamSettings(auto_swap=False, left_slot='B'))
    assert manager.settings.auto_swap is True
    assert manager.settings.left_slot == 'A'
    raw = payload()
    manager.update(raw)
    manager.update(payload('halftime_swap'))
    assert manager.settings.a_side == 'T'
    raw = payload('halftime_swap')
    raw['allplayers']['replacement'] = {'team': 'T'}
    manager.update(raw)
    assert 'replacement' in manager.rosters['A']
    manager.reset()
    assert manager.counts() == {'A': 0, 'B': 0}
