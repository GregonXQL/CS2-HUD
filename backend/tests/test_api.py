import time
from fastapi.testclient import TestClient
from app.main import create_app


def test_auth_and_tolerant_gsi(client, sample):
    assert client.post('/api/gsi', json=sample).status_code == 401
    assert client.get('/api/state').json()['last_update_ms'] is None
    for raw in ({'auth': {'token': 'test-token'}}, {**sample, 'auth': {'token': 'test-token'}}, {'auth': {'token': 'test-token'}, 'map': {'phase': []}, 'allplayers': []}):
        response = client.post('/api/gsi', json=raw)
        assert response.status_code == 200
        assert response.content == b''
    assert 'auth' not in client.get('/api/debug/raw').json()
    assert client.get('/api/health').json()['gsi_online']
    time.sleep(.3)
    assert not client.get('/api/health').json()['gsi_online']


def test_layout_and_persistence(client, config):
    default = client.get('/api/layout').json()
    assert set(default['modules']) == {'scoreboard', 'team_left', 'team_right', 'observed_player', 'radar'}
    assert client.patch('/api/layout/modules/missing', json={'x': 0}).json()['error']['code'] == 'MODULE_NOT_FOUND'
    for patch in ({'x': 3000}, {'scale': .1}, {'visible': None}, {'id': 'other'}):
        assert client.patch('/api/layout/modules/scoreboard', json=patch).status_code == 422
    value = client.patch('/api/layout/modules/scoreboard', json={'x': 750, 'scale': 1.2}).json()
    with TestClient(create_app(config)) as restarted:
        assert restarted.get('/api/layout').json() == value
    assert client.put('/api/layout', json=value).status_code == 200
    assert client.put('/api/layout', json={**value, 'modules': {}}).status_code == 422
    assert not client.post('/api/layout/visibility', json={'hud_visible': False}).json()['hud_visible']
    assert client.post('/api/layout/reset').json()['modules'] == default['modules']


def test_teams(client, config, sample):
    assert client.put('/api/teams', json={'left_slot': None}).status_code == 422
    result = client.put('/api/teams', json={'a_name': '北极星', 'b_name': '余烬', 'left_slot': 'B'}).json()
    assert result['a_name'] == '北极星'
    assert client.post('/api/teams/swap').json()['a_side'] == 'T'
    with TestClient(create_app(config)) as restarted:
        assert restarted.get('/api/teams').json()['a_side'] == 'T'
    sample['auth']['token'] = 'test-token'
    client.post('/api/gsi', json=sample)
    assert client.get('/api/state').json()['teams']['right']['name'] == '北极星'
    assert client.get('/api/teams').json()['roster_counts']['A'] == 5
    assert client.post('/api/teams/reset-roster').json()['roster_counts']['A'] == 0


def test_spa_and_api_404(config):
    config.frontend_dist = config.data_dir / 'dist'
    config.frontend_dist.mkdir()
    (config.frontend_dist / 'index.html').write_text('<html>HUD</html>')
    with TestClient(create_app(config)) as client:
        assert client.get('/hud').text == '<html>HUD</html>'
        assert client.get('/control').status_code == 200
        assert client.get('/api/missing').status_code == 404
        assert client.get('/api').status_code == 404
