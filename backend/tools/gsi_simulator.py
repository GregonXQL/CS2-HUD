"""Deterministic CS2 GSI scenarios. Standard library only; no running CS2 needed."""
import argparse
import copy
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

SCENARIOS = ['warmup', 'freezetime', 'live_round', 'bomb_plant', 'bomb_explode', 'round_end', 'halftime_swap', 'timeout', 'observer_switch', 'gameover', 'spectator_off']
NAMES = ['NOVA', 'frost', 'kairo', 'echo', 'Vex', 'FL1NT', 'orbit', 'sable', 'zero', 'rune']


def payload(scenario='live_round', progress=0, token='CHANGE_ME_TOKEN'):
    swap = scenario == 'halftime_swap'
    players = {}
    for i, name in enumerate(NAMES):
        side = 'CT' if (i < 5) != swap else 'T'
        health = max(0, 100 - int(progress * 140)) if i == 3 and scenario in ('live_round', 'bomb_plant', 'bomb_explode', 'round_end') else 100
        gun = 'm4a1_silencer' if side == 'CT' else 'ak47'
        players[str(76561198000000000 + i)] = {
            'name': name, 'observer_slot': i, 'team': side,
            'state': {'health': health, 'armor': 100, 'helmet': True, 'defusekit': side == 'CT', 'money': 4750 - i * 150 + int(progress * 3) * 100, 'equip_value': 5000, 'round_kills': int(progress * 3) if i == 0 else 0, 'round_killhs': 1 if i == 0 else 0, 'flashed': int(255 * (1-progress)) if i == 5 else 0},
            'match_stats': {'kills': 14-i + (int(progress * 3) if i == 0 else 0), 'assists': 3, 'deaths': 7+i, 'mvps': 2, 'score': 28},
            'weapons': {'weapon_0': {'name': 'weapon_' + gun, 'type': 'Rifle', 'state': 'active', 'ammo_clip': 30-int(progress*20), 'ammo_clip_max': 30, 'ammo_reserve': 90}, 'weapon_1': {'name': 'weapon_flashbang', 'type': 'Grenade', 'state': 'holstered'}, 'weapon_2': {'name': 'weapon_c4' if i == 7 else 'weapon_knife', 'type': 'C4' if i == 7 else 'Knife', 'state': 'holstered'}}}
    observed = list(players)[int(progress * 9) if scenario == 'observer_switch' else 0]
    phase = 'warmup' if scenario == 'warmup' else 'gameover' if scenario == 'gameover' else 'live'
    round_phase = 'freezetime' if scenario in ('freezetime', 'halftime_swap') else 'over' if scenario in ('round_end', 'gameover') else 'live'
    result = {'auth': {'token': token}, 'provider': {'name': 'Counter-Strike 2', 'timestamp': int(time.time())},
        'map': {'name': 'de_mirage', 'mode': 'competitive', 'phase': phase, 'round': 12 if swap else 23 if scenario == 'gameover' else 10,
            'team_ct': {'name': 'EMBER' if swap else 'NORTH STAR', 'score': 5 if swap else 6}, 'team_t': {'name': 'NORTH STAR' if swap else 'EMBER', 'score': 7 if swap else 4},
            'round_wins': {'1': 'ct_win_elimination', '2': 't_win_bomb', '3': 'ct_win_defuse'}},
        'round': {'phase': round_phase}, 'phase_countdowns': {'phase': round_phase, 'phase_ends_in': str(round((15 if round_phase == 'freezetime' else 115) * (1-progress), 1))},
        'allplayers': players, 'player': {'steamid': observed, **copy.deepcopy(players[observed])}}
    if scenario in ('round_end', 'gameover'):
        result['round']['win_team'] = 'CT'
    if scenario in ('bomb_plant', 'bomb_explode'):
        bomb_state = ('planted' if progress < .55 else 'defusing' if progress < .85 else 'defused') if scenario == 'bomb_plant' else ('planted' if progress < .9 else 'exploded')
        result['bomb'] = {'state': bomb_state, 'countdown': str(round(max(0, (40*(1-progress) if bomb_state == 'planted' else 5*(.85-progress)/.3)), 1)), 'player': observed}
        result['phase_countdowns'] = {'phase': 'defuse' if bomb_state == 'defusing' else 'bomb', 'phase_ends_in': result['bomb']['countdown']}
        if bomb_state in ('defused', 'exploded'):
            result['round'] = {'phase': 'over', 'bomb': bomb_state, 'win_team': 'CT' if bomb_state == 'defused' else 'T'}
    if scenario == 'timeout':
        result['phase_countdowns'] = {'phase': 'timeout_ct', 'phase_ends_in': str(round(30*(1-progress), 1))}
    if scenario == 'spectator_off':
        del result['allplayers']
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000/api/gsi')
    parser.add_argument('--token', default='CHANGE_ME_TOKEN')
    parser.add_argument('--scenario', choices=SCENARIOS + ['full_match'], default='full_match')
    parser.add_argument('--hz', type=float, default=10)
    parser.add_argument('--speed', type=float, default=1)
    parser.add_argument('--replay', type=Path)
    parser.add_argument('--loop', action='store_true')
    args = parser.parse_args()
    if args.hz <= 0 or args.speed <= 0:
        parser.error('--hz 和 --speed 必须大于 0')
    def send(value):
        value['auth'] = {'token': args.token}
        req = urllib.request.Request(args.url, json.dumps(value).encode(), {'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=2) as response:
                response.read()
        except urllib.error.URLError as error:
            print(f'发送失败：{error}', flush=True)
        time.sleep(1 / args.hz / args.speed)
    try:
        while True:
            if args.replay:
                with args.replay.open(encoding='utf-8') as recording:
                    for line in recording:
                        if line.strip(): send(json.loads(line))
            else:
                scenarios = SCENARIOS if args.scenario == 'full_match' else [args.scenario]
                for scene in scenarios:
                    print(f'场景：{scene}', flush=True)
                    frames = max(2, int(8 * args.hz))
                    for frame in range(frames):
                        send(payload(scene, frame / (frames-1), args.token))
            if not args.loop: break
    except KeyboardInterrupt:
        print('\n模拟结束')


if __name__ == '__main__':
    main()
