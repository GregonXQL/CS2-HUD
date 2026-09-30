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


def test_manual_swap_stable_and_substitution():
    manager = TeamManager(TeamSettings())
    raw = payload()
    manager.update(raw)
    manager.swap()
    manager.update(raw)
    assert manager.settings.a_side == 'T'
    manager.settings = manager.settings.model_copy(update={'auto_swap': False})
    raw['allplayers']['replacement'] = {'team': 'T'}
    manager.update(raw)
    assert 'replacement' in manager.rosters['A']
    manager.reset()
    assert manager.counts() == {'A': 0, 'B': 0}
