"""Run the frozen backend and hidden Electron renderer in an isolated test setup."""
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
from gsi_simulator import payload

ROOT = Path(__file__).resolve().parents[2]
TEST = ROOT / 'backend/build/desktop-smoke'
TEST.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, HOST='127.0.0.1', PORT='18080', DATA_DIR=str(TEST),
           FRONTEND_DIST=str(ROOT / 'frontend/dist'), GSI_TOKEN='desktop-smoke',
           DESKTOP_PARENT_PID=str(os.getpid()))
env.pop('ELECTRON_RUN_AS_NODE', None)
base = 'http://127.0.0.1:18080'


def request(route, data=None):
    req = urllib.request.Request(base + route, data=json.dumps(data).encode() if data is not None else None,
                                 headers={'Content-Type': 'application/json'})
    return urllib.request.urlopen(req, timeout=2)


with (TEST / 'backend.log').open('w') as log:
    server = subprocess.Popen([str(ROOT / 'backend/dist/CS2BroadcastBackend/CS2BroadcastBackend.exe')],
                              cwd=TEST, env=env, stdout=log, stderr=log,
                              creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError((TEST / 'backend.log').read_text())
            try:
                health = json.load(request('/api/health'))
                assert health['desktop_parent_pid'] == str(os.getpid()), 'Test port already occupied'
                break
            except OSError:
                time.sleep(.25)
        else:
            raise RuntimeError('Backend startup timed out')
        data = payload('bomb_plant', .3, 'desktop-smoke')
        data['map']['name'] = os.environ.get('SMOKE_MAP', 'de_mirage')
        for player in data['allplayers'].values():
            player['weapons']['weapon_3'] = {'name': 'weapon_smokegrenade', 'type': 'Grenade', 'ammo_reserve': 1}
            player['weapons']['weapon_4'] = {'name': 'weapon_hegrenade', 'type': 'Grenade', 'ammo_reserve': 1}
        request('/api/gsi', data).close()
        state = json.load(request('/api/state'))
        assert len(state['players']) == 10 and state['players'][0]['position']
        assert state['bomb']['position']
        assert len(json.load(request('/api/layout'))['modules']) == 5
        for route in ['/control', '/hud', '/maps/de_mirage.png', '/maps/de_nuke_lower.png', '/maps/de_cache.png']:
            assert request(route).status == 200
        result = subprocess.run([str(ROOT / 'overlay/node_modules/electron/dist/electron.exe'),
                                 str(ROOT / 'overlay/scripts/visual-smoke.cjs')],
                                env=env, creationflags=subprocess.CREATE_NO_WINDOW, timeout=45)
        assert result.returncode == 0, 'Electron rendering check failed'
        print('Frozen backend / GSI / map assets / Electron rendering passed')
    finally:
        server.terminate()
        server.wait(timeout=10)
