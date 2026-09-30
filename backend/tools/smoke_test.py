"""Exercise a running server and two WebSocket clients. Uses temporary layout edits, restored on exit."""
import argparse
import asyncio
import json
import time
import httpx
from websockets.asyncio.client import connect
from gsi_simulator import payload


async def receive(ws, kind):
    async with asyncio.timeout(3):
        while True:
            message = json.loads(await ws.recv())
            if message['type'] == kind:
                return message


async def main(url, token):
    async with httpx.AsyncClient(base_url=url) as client:
        for page in ('/control', '/hud'):
            response = await client.get(page)
            assert response.status_code == 200 and '<div id="root">' in response.text
        layout = (await client.get('/api/layout')).json()
        ws_url = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
        async with connect(ws_url + '?role=hud') as hud, connect(ws_url + '?role=control') as control:
            assert (await receive(hud, 'snapshot'))['payload']['layout'] == layout
            await receive(control, 'snapshot')
            try:
                start = time.perf_counter()
                response = await client.post('/api/layout/visibility', json={'hud_visible': not layout['hud_visible']})
                response.raise_for_status()
                results = await asyncio.gather(receive(hud, 'layout'), receive(control, 'layout'))
                elapsed = (time.perf_counter() - start) * 1000
                assert all(m['payload']['hud_visible'] != layout['hud_visible'] for m in results)
                assert elapsed < 200, f'局部同步延迟 {elapsed:.1f}ms'
                print(f'PASS 双窗口显隐同步：{elapsed:.1f}ms')
                response = await client.post('/api/gsi', json=payload('live_round', .9, token))
                response.raise_for_status()
                state = (await receive(hud, 'state'))['payload']
                assert len(state['players']) == 10 and state['players'][3]['health'] == 0
                await client.post('/api/gsi', json=payload('halftime_swap', 0, token))
                swapped = (await receive(hud, 'state'))['payload']
                assert swapped['teams']['left']['slot'] == state['teams']['left']['slot']
                assert swapped['teams']['left']['side'] != state['teams']['left']['side']
                await client.post('/api/gsi', json=payload('spectator_off', 0, token))
                solo = (await receive(hud, 'state'))['payload']
                assert not solo['players'] and solo['observed_player'] is not None
                print('PASS 生产静态页面、10 人数据、死亡、中场换边、非观战降级')
            finally:
                (await client.put('/api/layout', json=layout)).raise_for_status()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--token', default='CHANGE_ME_TOKEN')
    args = parser.parse_args()
    asyncio.run(main(args.url, args.token))
