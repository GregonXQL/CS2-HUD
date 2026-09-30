import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { HudModule } from './modules/Modules';
export function HudPage() {
  const { state, layout, connected } = useStore();
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight });
  const overlay = new URLSearchParams(location.search).get('overlay') === '1';
  useEffect(() => { const resize = () => setSize({ width: innerWidth, height: innerHeight }); addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, []);
  const scale = Math.min(size.width / 1920, size.height / 1080);
  if (!state || !layout) return null;
  const placeholder = { ...state, teams: { left: { ...state.teams.left, name: '—', score: 0 }, right: { ...state.teams.right, name: '—', score: 0 } }, players: [], observed_player: null, observed_steamid: null, round: { ...state.round, phase_ends_in: null }, bomb: { ...state.bomb, state: 'none' as const } };
  return <div className="hud-page" style={{ pointerEvents: overlay ? 'none' : undefined }}><div className="hud-canvas" style={{ left: (size.width - 1920 * scale) / 2, top: (size.height - 1080 * scale) / 2, transform: `scale(${scale})`, opacity: layout.hud_visible && (!overlay || (connected && state.gsi_online)) ? 1 : 0 }}>
    {Object.values(layout.modules).map(m => <div key={m.id} className="hud-module" style={{ left: m.x, top: m.y, transform: `scale(${m.scale})`, zIndex: m.z, opacity: m.visible ? 1 : 0 }}><HudModule id={m.id} state={!overlay && !state.gsi_online ? placeholder : state}/></div>)}
  </div></div>;
}
