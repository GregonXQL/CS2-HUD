import pytest
from app.core.normalizer import vector, normalize
from app.core.default_layout import default_layout
from app.models.layout import HudLayout
from app.models.teams import TeamSettings


@pytest.mark.parametrize('value', [None, '', '1,2', 'NaN,2,3', 'Infinity,2,3', {}, [1, 2, None]])
def test_invalid_position(value):
    assert vector(value) is None


def test_positions_and_grenade_counts():
    raw = {'allplayers': {'1': {'position': '100, -200, 30', 'forward': '1,0,0',
           'state': {'health': 100}, 'weapons': {'0': {'name': 'weapon_flashbang', 'type': 'Grenade', 'ammo_reserve': 2}}}},
           'bomb': {'state': 'planted', 'position': '300,400,10'}}
    result = normalize(raw, TeamSettings(), 1)
    assert result.players[0].position.y == -200
    assert result.players[0].forward.x == 1
    assert result.players[0].grenades == ['Flash', 'Flash']
    assert result.bomb.position.x == 300
    assert normalize({}, TeamSettings(), 2).bomb.position is None


def test_legacy_layout_migration_preserves_customization():
    old = default_layout().model_dump()
    del old['modules']['radar']
    old['modules']['scoreboard']['x'] = 123
    old['hud_visible'] = False
    new = HudLayout.model_validate(old)
    assert new.modules['radar'].visible
    assert new.modules['scoreboard'].x == 123
    assert not new.hud_visible
