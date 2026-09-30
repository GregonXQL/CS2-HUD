export type Side = 'CT' | 'T';
export type Slot = 'A' | 'B';
export type ModuleId = 'scoreboard' | 'team_left' | 'team_right' | 'observed_player';
export interface ModuleLayout { id: ModuleId; visible: boolean; x: number; y: number; scale: number; z: number }
export interface HudLayout { version: 1; hud_visible: boolean; modules: Record<ModuleId, ModuleLayout>; updated_at_ms: number }
export interface TeamSettings { a_name: string | null; b_name: string | null; a_short: string | null; b_short: string | null; a_side: Side; left_slot: Slot; auto_swap: boolean; roster_counts?: Record<Slot, number> }
export interface Weapon { name: string; display_name: string; type: string | null; active: boolean; ammo_clip: number | null; ammo_clip_max: number | null; ammo_reserve: number | null }
export interface Player {
  steamid: string; name: string; observer_slot: number | null; side: Side | null; team_slot: Slot | null;
  health: number; armor: number; helmet: boolean; defusekit: boolean; money: number; equip_value: number;
  round_kills: number; round_killhs: number; flashed: number; burning: number;
  kills: number; assists: number; deaths: number; mvps: number; score: number;
  is_alive: boolean; is_observed: boolean; has_bomb: boolean;
  active_weapon: Weapon | null; primary: Weapon | null; secondary: Weapon | null; grenades: string[];
}
export interface TeamView { slot: Slot; side: Side; name: string; short_name: string | null; score: number; timeouts_remaining: number | null; consecutive_round_losses: number | null; series_wins: number | null; alive_count: number }
export interface MatchState {
  gsi_online: boolean; last_update_ms: number | null; has_allplayers: boolean;
  map: { name: string | null; display_name: string | null; mode: string | null; phase: 'warmup' | 'live' | 'intermission' | 'gameover' | 'unknown'; current_round: number };
  round: { phase: 'freezetime' | 'live' | 'over' | 'unknown'; countdown_phase: string | null; phase_ends_in: number | null; win_side: Side | null };
  teams: { left: TeamView; right: TeamView }; players: Player[]; observed_steamid: string | null; observed_player: Player | null;
  bomb: { state: 'carried' | 'dropped' | 'planting' | 'planted' | 'defusing' | 'defused' | 'exploded' | 'none'; countdown: number | null; player_steamid: string | null };
  round_history: { round: number; winner_side: Side; reason: 'elimination' | 'bomb' | 'defuse' | 'time' | 'unknown' }[];
}
