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
