import { useEffect, useState, type CSSProperties } from 'react';
import type { MatchState, ModuleId, Player, Side } from '../../lib/types';
import { useStore } from '../../lib/store';
export const sideColor = (side: Side | null) => side === 'T' ? '#DE9B35' : '#5D79AE';
const teamStyle = (side: Side | null) => ({ '--side': sideColor(side) }) as CSSProperties;
function Equipment({ player: p }: { player: Player }) {
  return <span className="equipment">
    <svg viewBox="0 0 24 24" aria-label={p.helmet ? '头盔护甲' : '护甲'}><path d={p.helmet ? 'M4 13V10a8 8 0 0 1 16 0v3H4m0 0v5h6v-5m10 0v5h-6v-5' : 'M4 4l8-2 8 2v9c0 5-8 9-8 9s-8-4-8-9Z'} fill="none" stroke="currentColor" strokeWidth="2"/></svg>{p.armor}
    {p.defusekit && p.side === 'CT' && <svg viewBox="0 0 24 24" aria-label="拆弹器"><path d="m4 3 16 18M20 3 4 21M4 3v6m16-6v6" stroke="currentColor" strokeWidth="2"/></svg>}
    {p.has_bomb && <b>C4</b>}
  </span>;
}
export function PlayerCard({ player: p, mirror }: { player: Player; mirror: boolean }) {
  return <div className={`player-card ${mirror ? 'mirror' : ''} ${p.is_alive ? '' : 'dead'} ${p.is_observed ? 'observed' : ''}`} style={teamStyle(p.side)}>
    <span className="slot-number">{p.observer_slot === null ? '—' : (p.observer_slot + 1) % 10}</span>
    <div className="player-main"><div className="player-line"><b className="player-name">{p.name}<i style={{ opacity: Math.min(1, Math.max(0, p.flashed / 255)) }}/></b><Equipment player={p}/><strong>{p.health}</strong></div>
    <div className="player-meta"><span>${p.money}</span><span>{p.kills} / {p.assists} / {p.deaths}</span><span>{(p.primary ?? p.secondary)?.display_name ?? '—'}</span>{p.round_kills > 0 && <b>+{p.round_kills}</b>}</div>
    <div className="health-track"><div style={{ width: `${p.health}%`, background: p.health <= 20 ? '#E5484D' : 'var(--side)' }}/></div></div>
  </div>;
}
export function Scoreboard({ state: s }: { state: MatchState }) {
  const receivedAt = useStore(v => v.receivedAt);
  const [now, setNow] = useState(performance.now());
  useEffect(() => { const id = setInterval(() => setNow(performance.now()), 100); return () => clearInterval(id); }, []);
  const bombActive = ['planted', 'defusing'].includes(s.bomb.state);
  const seconds = (bombActive ? s.bomb.countdown : s.round.phase_ends_in) ?? s.round.phase_ends_in;
  const remaining = seconds === null ? null : Math.ceil(Math.max(0, seconds - (s.gsi_online ? Math.max(0, now - receivedAt) / 1000 : 0)));
  let main = remaining === null ? '—:—' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  let label = `第 ${s.map.current_round} 回合`;
  if (s.round.phase === 'freezetime') label = '准备阶段';
  if (bombActive) label = s.bomb.state === 'defusing' ? '拆弹中' : '炸弹已安放';
  if (['defused', 'exploded'].includes(s.bomb.state)) { main = s.bomb.state === 'defused' ? '已拆除' : '已爆炸'; }
  if (s.round.phase === 'over') { const win = Object.values(s.teams).find(t => t.side === s.round.win_side); label = `${win?.name ?? s.round.win_side ?? '—'} 获胜`; }
  if (s.round.countdown_phase?.startsWith('timeout')) label = `战术暂停 · ${Object.values(s.teams).find(t => t.side.toLowerCase() === s.round.countdown_phase?.slice(8))?.name ?? ''}`;
  if (s.map.phase === 'warmup') label = '热身';
  if (s.map.phase === 'gameover') label = '比赛结束';
  return <div className={`scoreboard ${bombActive ? 'bomb-active' : ''}`}>
    <div className="team-name" style={teamStyle(s.teams.left.side)}>{s.teams.left.name}</div><b className="team-score" style={teamStyle(s.teams.left.side)}>{s.teams.left.score}</b>
    <div className="round-clock"><strong>{main}</strong><small>{label}</small></div>
    <b className="team-score" style={teamStyle(s.teams.right.side)}>{s.teams.right.score}</b><div className="team-name" style={teamStyle(s.teams.right.side)}>{s.teams.right.name}</div>
  </div>;
}
export function HudModule({ id, state }: { id: ModuleId; state: MatchState }) {
  if (id === 'scoreboard') return <Scoreboard state={state}/>;
  if (id === 'observed_player') {
    const p = state.observed_player ?? state.players.find(p => p.steamid === state.observed_steamid);
    if (!p) return null;
    return <div className="observed-panel" style={teamStyle(p.side)}><div className="observed-title"><b>{p.name}</b><span>${p.money} · MVP {p.mvps}</span></div><div className="observed-detail"><strong>{p.health}<small>HP</small></strong><Equipment player={p}/><span>{p.kills} / {p.assists} / {p.deaths}</span><b>{p.active_weapon?.display_name ?? '—'}<small>{p.active_weapon?.ammo_clip ?? '—'} / {p.active_weapon?.ammo_reserve ?? '—'}</small></b></div><div className="grenades">{p.grenades.join(' · ')}</div></div>;
  }
  const team = id === 'team_left' ? state.teams.left : state.teams.right;
  return <div className="team-panel">{state.players.filter(p => p.team_slot === team.slot).slice(0, 5).map(p => <PlayerCard key={p.steamid} player={p} mirror={id === 'team_right'}/>)}</div>;
}
