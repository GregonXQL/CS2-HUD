import { useEffect, useState } from 'react';
import type { MatchState } from '../../lib/types';
import { radarPoint, type Overview } from '../../lib/radar';
import { RadarMarker } from './RadarMarker';

export function Radar({ state }: { state: MatchState }) {
  const [maps, setMaps] = useState<Record<string, Overview>>({});
  const [failed, setFailed] = useState('');
  useEffect(() => { const abort = new AbortController(); void fetch('/maps/manifest.json', { signal: abort.signal }).then(r => r.json()).then(setMaps).catch(() => {}); return () => abort.abort(); }, []);
  const key = state.map.name?.split('/').pop() ?? '';
  const map = maps[key];
  const observed = state.observed_player ?? state.players.find(p => p.is_observed);
  const lower = !!(map?.lowerImage && observed?.position && observed.position.z < (map.lowerMax ?? -Infinity));
  const src = map && (lower ? map.lowerImage! : map.image);
  const players = state.players.filter(p => p.position && p.is_alive);
  const bomb = state.bomb.position && map ? radarPoint(state.bomb.position, map) : null;
  return <div className="radar"><div className="radar-title"><b>{state.map.display_name ?? '小地图'}</b><span>{map?.lowerImage ? (lower ? '下层' : '上层') : 'LIVE'}</span></div>
    {!map ? <div className="radar-empty">{key ? `未配置地图：${key}` : '等待地图数据'}</div> : <div className="radar-map">
      {failed !== src && <img src={src} alt={`${state.map.display_name ?? key} 雷达底图`} draggable={false} onError={() => setFailed(src!)}/>}
      <svg viewBox="0 0 340 340" aria-label="比赛小地图">
      {players.map(p => { const point = radarPoint(p.position!, map); const otherFloor = !!map.lowerImage && (p.position!.z < (map.lowerMax ?? -Infinity)) !== lower; return <RadarMarker key={`${key}:${state.map.current_round}:${src}:${p.steamid}:${otherFloor}`} {...point} angle={p.forward ? Math.atan2(-p.forward.y, p.forward.x) * 180 / Math.PI : null} color={p.side === 'T' ? '#DE9B35' : '#83aff5'} opacity={otherFloor ? .4 : 1}>
        <title>{p.name}{otherFloor ? '（另一层）' : ''}</title>
        <circle r="9" fill={p.side === 'T' ? '#DE9B35' : '#5D79AE'} stroke={p.is_observed ? '#fff' : '#101820'} strokeWidth={p.is_observed ? 3 : 1.5}/>
        <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="12" fontWeight="bold">{p.observer_slot === null ? '·' : (p.observer_slot + 1) % 10}</text>
        {p.has_bomb && <rect x="5" y="6" width="6" height="6" fill="#ff6565"/>}
      </RadarMarker>; })}
      {bomb && ['dropped', 'planting', 'planted', 'defusing'].includes(state.bomb.state) && <g transform={`translate(${bomb.x} ${bomb.y})`}><rect x="-6" y="-6" width="12" height="12" fill="#ff5555" stroke="white"/><title>C4 · {state.bomb.state}</title></g>}
      {(!players.length || failed === src) && <text x="170" y="325" textAnchor="middle" fill="white" fontSize="13">{failed === src ? '底图加载失败' : '等待选手坐标（需要观战 GSI）'}</text>}
    </svg></div>}
  </div>;
}
