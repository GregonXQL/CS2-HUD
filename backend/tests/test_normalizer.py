import json
from pathlib import Path
import pytest
from app.core.normalizer import normalize
from app.models.teams import TeamSettings
from tools.gsi_simulator import SCENARIOS, payload


@pytest.mark.parametrize('scenario', SCENARIOS)
def test_scenarios(scenario):
    raw = json.loads((Path(__file__).parent / 'fixtures' / f'{scenario}.json').read_text())
    state = normalize(raw, TeamSettings(), 1234)
    assert len(state.players) == (0 if scenario == 'spectator_off' else 10)
    assert state.observed_player is not None
    assert state.map.current_round == raw['map']['round'] + 1
    assert [r.reason for r in state.round_history] == ['elimination', 'bomb', 'defuse']
    assert state.observed_player.active_weapon.display_name == ('AK-47' if scenario in ('halftime_swap', 'observer_switch') else 'M4A1-S')


@pytest.mark.parametrize('raw', [{}, {'allplayers': {}}, {'allplayers': None}, {'map': [], 'player': [], 'bomb': []}, {'map': {'phase': []}, 'allplayers': {'bad': None, 'ok': {'team': [], 'weapons': {'weapon_0': []}}}}, {'phase_countdowns': {'phase_ends_in': 'NaN'}, 'player': {'steamid': '1', 'state': {'health': {}}}}])
def test_malformed(raw):
    state = normalize(raw, TeamSettings(), 1)
    assert state.map.current_round >= 1
    state.model_dump_json()


def test_strings_and_weapons(sample):
    player = next(iter(sample['allplayers'].values()))
    player['state']['health'] = '18'
    player['state']['helmet'] = 'false'
    player['weapons']['weapon_3'] = {'name': 'weapon_future', 'type': 'Pistol'}
    state = normalize(sample, TeamSettings(), 1)
    assert state.players[0].health == 18
    assert not state.players[0].helmet
    assert state.players[0].secondary.display_name == 'future'
    assert state.players[0].grenades == ['Flash']
    assert state.players[0].primary.display_name == 'M4A1-S'


def test_scoreboard_follows_numbers_even_with_legacy_left_selection():
    raw = payload()
    settings = TeamSettings(a_name='Alpha', b_name='Bravo', left_slot='B')
    state = normalize(raw, settings, 1)
    assert state.teams.left.name == 'Alpha'
    # CS2 may reassign observer numbers; names/scores must follow the numbered group.
    for player in raw['allplayers'].values():
        player['observer_slot'] = (player['observer_slot'] + 5) % 10
        player['state']['health'] = 0
    state = normalize(raw, settings, 2)
    assert state.teams.left.name == 'Bravo'
    assert state.teams.left.side == 'T'
    assert state.teams.left.score == raw['map']['team_t']['score']
    assert state.teams.right.name == 'Alpha'


def test_halftime_without_renumbering_keeps_numbered_team_on_left():
    from app.core.team_manager import TeamManager
    manager = TeamManager(TeamSettings(a_name='Alpha', auto_swap=False))
    manager.update(payload())
    raw = payload('halftime_swap')
    manager.update(raw)
    state = normalize(raw, manager.settings, 1)
    assert state.teams.left.name == 'Alpha'
    assert state.teams.left.side == 'T'


@pytest.mark.parametrize('slot', [None, -1, 10, 1.5, True, 'NaN'])
def test_invalid_observer_numbers_are_not_assigned(slot):
    raw = payload()
    next(iter(raw['allplayers'].values()))['observer_slot'] = slot
    state = normalize(raw, TeamSettings(), 1)
    assert next(p for p in state.players if p.name == 'NOVA').observer_slot is None
