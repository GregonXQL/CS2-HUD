import time


def receive_kind(ws, kind):
    for _ in range(30):
        message = ws.receive_json()
        if message['type'] == kind:
            return message
    raise AssertionError(f'未收到 {kind}')


def test_snapshot_layout_multiclient_and_ping(client):
    with client.websocket_connect('/ws?role=hud') as hud, client.websocket_connect('/ws?role=control') as control:
        assert hud.receive_json()['type'] == 'snapshot'
        assert control.receive_json()['type'] == 'snapshot'
        assert client.get('/api/health').json()['ws_clients'] == {'hud': 1, 'control': 1}
        client.patch('/api/layout/modules/scoreboard', json={'x': 700})
        for ws in (hud, control):
            assert receive_kind(ws, 'layout')['payload']['modules']['scoreboard']['x'] == 700
        hud.send_json({'type': 'ping'})
        assert receive_kind(hud, 'pong')['payload'] == {}


def test_gsi_heartbeat_no_state_and_offline(client, sample):
    sample['auth']['token'] = 'test-token'
    with client.websocket_connect('/ws') as ws:
        ws.receive_json()
        client.post('/api/gsi', json=sample)
        first = receive_kind(ws, 'state')
        assert first['payload']['has_allplayers']
        client.post('/api/gsi', json=sample)
        time.sleep(.07)
        ws.send_json({'type': 'ping'})
        message = ws.receive_json()
        assert message['type'] == 'pong', '心跳帧不应产生 state'
        offline = receive_kind(ws, 'gsi_status')
        assert offline['payload']['online'] is False
        client.post('/api/gsi', json=sample)
        assert receive_kind(ws, 'gsi_status')['payload']['online'] is True


def test_state_throttle_and_latest(client, sample):
    sample['auth']['token'] = 'test-token'
    with client.websocket_connect('/ws') as ws:
        ws.receive_json()
        start = time.monotonic()
        for i in range(60):
            sample['map']['round'] = i
            client.post('/api/gsi', json=sample)
        time.sleep(.07)
        ws.send_json({'type': 'ping'})
        states = []
        while True:
            message = ws.receive_json()
            if message['type'] == 'pong': break
            if message['type'] == 'state': states.append(message)
        assert states[-1]['payload']['map']['current_round'] == 60
        assert len(states) <= int((time.monotonic() - start) * 20) + 1
        assert all(b['ts'] - a['ts'] >= 45 for a, b in zip(states, states[1:]))
