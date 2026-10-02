import math
from app.models.match import MatchState, MapInfo, RoundInfo, BombInfo, RoundResult, Player, Weapon, TeamView, TeamsView
from app.models.teams import TeamSettings
from app.core.weapons import display_name


def obj(value):
    return value if isinstance(value, dict) else {}


def number(value, default=0):
    try:
        result = float(value)
        return result if math.isfinite(result) else default
    except (ValueError, TypeError, OverflowError):
        return default


def integer(value, default=0):
    result = number(value, default)
    return int(result) if result is not None else None


def string(value):
    return value if isinstance(value, str) else None


def boolean(value):
    return value is True or value == 1 or value == '1' or value == 'true'


def choice(value, allowed, default=None):
    return value if isinstance(value, str) and value in allowed else default


def vector(value):
    parts = value.split(',') if isinstance(value, str) else value
    if not isinstance(parts, (list, tuple)) or len(parts) != 3:
        return None
    values = [number(v, None) for v in parts]
    return dict(zip(('x', 'y', 'z'), values)) if all(v is not None for v in values) else None


def observer_index(value):
    value = number(value, None) if not isinstance(value, bool) else None
    return int(value) if value is not None and value.is_integer() and 0 <= value <= 9 else None


def parse_player(steamid, raw, teams, observed):
    raw = obj(raw)
    state, stats = obj(raw.get('state')), obj(raw.get('match_stats'))
    side = choice(raw.get('team'), ('CT', 'T'))
    weapons = []
    for value in obj(raw.get('weapons')).values():
        w = obj(value)
        name = string(w.get('name')) or ''
        if not name:
            continue
        weapons.append(Weapon(name=name, display_name=display_name(name), type=string(w.get('type')),
                              active=w.get('state') == 'active', **{
                                  key: integer(w.get(key), None) for key in ('ammo_clip', 'ammo_clip_max', 'ammo_reserve')}))
    primary = next((w for w in weapons if w.type in ('Rifle', 'SniperRifle', 'SMG', 'Shotgun', 'Machine Gun', 'MachineGun')), None)
    health = max(0, min(100, integer(state.get('health'))))
    return Player(position=vector(raw.get('position')), forward=vector(raw.get('forward')), steamid=str(steamid), name=string(raw.get('name')) or '—', observer_slot=observer_index(raw.get('observer_slot')),
                  side=side, team_slot=('A' if side == teams.a_side else 'B') if side else None,
                  health=health, armor=max(0, integer(state.get('armor'))),
                  helmet=boolean(state.get('helmet')), defusekit=boolean(state.get('defusekit')),
                  **{k: integer(state.get(k)) for k in ('money', 'equip_value', 'round_kills', 'round_killhs', 'flashed', 'burning')},
                  **{k: integer(stats.get(k)) for k in ('kills', 'assists', 'deaths', 'mvps', 'score')},
                  is_alive=health > 0, is_observed=str(steamid) == observed,
                  has_bomb=any(w.name == 'weapon_c4' for w in weapons),
                  active_weapon=next((w for w in weapons if w.active), None), primary=primary,
                  secondary=next((w for w in weapons if w.type == 'Pistol'), None),
                  grenades=[w.display_name for w in weapons if w.type == 'Grenade' for _ in range(max(1, min(4, w.ammo_reserve or 1)))])


def normalize(raw: dict, settings: TeamSettings, now_ms: int, online=True) -> MatchState:
    raw = obj(raw)
    m, r, c, b = (obj(raw.get(k)) for k in ('map', 'round', 'phase_countdowns', 'bomb'))
    observed = string(obj(raw.get('player')).get('steamid'))
    allplayers = obj(raw.get('allplayers'))
    players = [parse_player(sid, p, settings, observed) for sid, p in allplayers.items() if isinstance(p, dict)]
    players.sort(key=lambda p: (p.observer_slot if p.observer_slot is not None else 99, p.steamid))
    players = players[:10]
    current = next((p for p in players if p.steamid == observed), None)
    if current is None and observed:
        current = parse_player(observed, raw.get('player'), settings, observed)
    views = {}
    for slot in ('A', 'B'):
        side = settings.a_side if slot == 'A' else ('T' if settings.a_side == 'CT' else 'CT')
        team = obj(m.get('team_' + side.lower()))
        views[slot] = TeamView(slot=slot, side=side,
            name=getattr(settings, slot.lower() + '_name') or string(team.get('name')) or side,
            short_name=getattr(settings, slot.lower() + '_short'), score=integer(team.get('score')),
            timeouts_remaining=integer(team.get('timeouts_remaining'), None),
            consecutive_round_losses=integer(team.get('consecutive_round_losses'), None),
            series_wins=integer(team.get('matches_won_this_series'), None),
            alive_count=sum(p.is_alive and p.side == side for p in players))
    # Fixed panel numbers: GSI slots 0..4 are displayed as 1..5 on the left.
    # Include dead players so deaths cannot flip the scoreboard's team identity.
    numbered_left = [p.side for p in players if p.observer_slot is not None and p.observer_slot < 5 and p.side]
    if not numbered_left:
        numbered_left = [('T' if p.side == 'CT' else 'CT') for p in players
                         if p.observer_slot is not None and p.observer_slot >= 5 and p.side]
    left_side = settings.a_side
    if numbered_left.count('CT') != numbered_left.count('T'):
        left_side = 'CT' if numbered_left.count('CT') > numbered_left.count('T') else 'T'
    left_slot = 'A' if left_side == settings.a_side else 'B'
    history = []
    for index, value in obj(m.get('round_wins')).items():
        parts = value.split('_win_') if isinstance(value, str) else []
        if len(parts) == 2 and parts[0] in ('ct', 't') and integer(index) > 0:
            history.append(RoundResult(round=integer(index), winner_side=parts[0].upper(),
                reason=choice(parts[1], ('elimination', 'bomb', 'defuse', 'time'), 'unknown')))
    name = string(m.get('name'))
    return MatchState(gsi_online=online, last_update_ms=now_ms, has_allplayers=bool(allplayers),
        map=MapInfo(name=name, display_name=name.removeprefix('de_').removeprefix('cs_').replace('_', ' ').title() if name else None,
            mode=string(m.get('mode')), phase=choice(m.get('phase'), ('warmup', 'live', 'intermission', 'gameover'), 'unknown'),
            current_round=max(1, integer(m.get('round')) + 1)),
        round=RoundInfo(phase=choice(r.get('phase'), ('freezetime', 'live', 'over'), 'unknown'),
            countdown_phase=string(c.get('phase')), phase_ends_in=number(c.get('phase_ends_in'), None), win_side=choice(r.get('win_team'), ('CT', 'T'))),
        teams=TeamsView(left=views[left_slot], right=views['B' if left_slot == 'A' else 'A']),
        players=players, observed_steamid=observed, observed_player=current,
        bomb=BombInfo(position=vector(b.get('position')), state=choice(b.get('state') or r.get('bomb'), ('carried', 'dropped', 'planting', 'planted', 'defusing', 'defused', 'exploded'), 'none'),
            countdown=number(b.get('countdown'), None), player_steamid=string(b.get('player'))),
        round_history=sorted(history, key=lambda item: item.round))
