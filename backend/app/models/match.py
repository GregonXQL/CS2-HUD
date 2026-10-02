from typing import Literal
from pydantic import BaseModel, Field

Side = Literal['CT', 'T']
Slot = Literal['A', 'B']


class MapInfo(BaseModel):
    name: str | None = None
    display_name: str | None = None
    mode: str | None = None
    phase: Literal['warmup', 'live', 'intermission', 'gameover', 'unknown'] = 'unknown'
    current_round: int = 1


class RoundInfo(BaseModel):
    phase: Literal['freezetime', 'live', 'over', 'unknown'] = 'unknown'
    countdown_phase: str | None = None
    phase_ends_in: float | None = None
    win_side: Side | None = None


class Position(BaseModel):
    x: float
    y: float
    z: float


class BombInfo(BaseModel):
    position: Position | None = None
    state: Literal['carried', 'dropped', 'planting', 'planted', 'defusing', 'defused', 'exploded', 'none'] = 'none'
    countdown: float | None = None
    player_steamid: str | None = None


class RoundResult(BaseModel):
    round: int
    winner_side: Side
    reason: Literal['elimination', 'bomb', 'defuse', 'time', 'unknown']


class Weapon(BaseModel):
    name: str
    display_name: str
    type: str | None = None
    active: bool = False
    ammo_clip: int | None = None
    ammo_clip_max: int | None = None
    ammo_reserve: int | None = None


class Player(BaseModel):
    position: Position | None = None
    forward: Position | None = None
    steamid: str
    name: str = '—'
    observer_slot: int | None = None
    side: Side | None = None
    team_slot: Slot | None = None
    health: int = 0
    armor: int = 0
    helmet: bool = False
    defusekit: bool = False
    money: int = 0
    equip_value: int = 0
    round_kills: int = 0
    round_killhs: int = 0
    flashed: int = 0
    burning: int = 0
    kills: int = 0
    assists: int = 0
    deaths: int = 0
    mvps: int = 0
    score: int = 0
    is_alive: bool = False
    is_observed: bool = False
    has_bomb: bool = False
    active_weapon: Weapon | None = None
    primary: Weapon | None = None
    secondary: Weapon | None = None
    grenades: list[str] = Field(default_factory=list)


class TeamView(BaseModel):
    slot: Slot
    side: Side
    name: str
    short_name: str | None = None
    score: int = 0
    timeouts_remaining: int | None = None
    consecutive_round_losses: int | None = None
    series_wins: int | None = None
    alive_count: int = 0


class TeamsView(BaseModel):
    left: TeamView = Field(default_factory=lambda: TeamView(slot='A', side='CT', name='CT'))
    right: TeamView = Field(default_factory=lambda: TeamView(slot='B', side='T', name='T'))


class MatchState(BaseModel):
    gsi_online: bool = False
    last_update_ms: int | None = None
    has_allplayers: bool = False
    map: MapInfo = Field(default_factory=MapInfo)
    round: RoundInfo = Field(default_factory=RoundInfo)
    teams: TeamsView = Field(default_factory=TeamsView)
    players: list[Player] = Field(default_factory=list)
    observed_steamid: str | None = None
    # Extension: preserves the observed player when allplayers is absent.
    observed_player: Player | None = None
    bomb: BombInfo = Field(default_factory=BombInfo)
    round_history: list[RoundResult] = Field(default_factory=list)
