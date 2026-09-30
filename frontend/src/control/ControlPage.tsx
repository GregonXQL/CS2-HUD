import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { api, patchModule } from '../lib/api';
import { clamp, clampScale } from '../lib/coords';
import type { ModuleId, TeamSettings } from '../lib/types';
import { registry } from '../hud/modules/registry';
import { LayoutEditor } from './LayoutEditor';
function Field({ label, value, commit, type = 'text', min, max, step }: { label: string; value: string | number; commit: (value: string) => void; type?: string; min?: number; max?: number; step?: number }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(String(value)); }, [value, focused]);
  return <label className="field"><span>{label}</span><input type={type} value={draft} min={min} max={max} step={step} onFocus={() => setFocused(true)} onChange={e => setDraft(e.target.value)} onBlur={e => { if (e.target.validity.valid && draft !== String(value)) commit(draft); else setDraft(String(value)); setFocused(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/></label>;
}
export function ControlPage() {
  const { state, layout, teams, connected, clients, error } = useStore();
  const [selected, select] = useState<ModuleId>('scoreboard');
  const [background, setBackground] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => { const id = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    const refresh = () => void fetch('/api/health', { signal: controller.signal }).then(r => r.json()).then(value => setLastUpdate(value.last_update_ms)).catch(() => {});
    refresh();
    const id = setInterval(refresh, 2000);
    return () => { clearInterval(id); controller.abort(); };
  }, [connected]);
  useEffect(() => () => { if (background) URL.revokeObjectURL(background); }, [background]);
  useEffect(() => { if (!error) return; const id = setTimeout(() => useStore.setState({ error: null }), 6500); return () => clearTimeout(id); }, [error]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (!connected || !layout || target.closest('input, textarea, select, [contenteditable=true]') || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === 'h') { event.preventDefault(); void api('/layout/visibility', 'POST', { hud_visible: !layout.hud_visible }); }
      const delta = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
      if (delta) { event.preventDefault(); const m = layout.modules[selected], step = event.shiftKey ? 10 : 1; patchModule(selected, { x: clamp(m.x + delta[0] * step, -500, 2420), y: clamp(m.y + delta[1] * step, -500, 1580) }); }
    };
    addEventListener('keydown', keydown); return () => removeEventListener('keydown', keydown);
  }, [connected, layout, selected]);
  const updateTeam = (value: Partial<TeamSettings>) => void api('/teams', 'PUT', value);
  const m = layout?.modules[selected];
  const latestFrame = Math.max(lastUpdate ?? 0, state?.last_update_ms ?? 0);
  const since = latestFrame ? Math.max(0, Math.floor((clock - latestFrame) / 1000)) : null;
  return <main className="control-shell">
    <header className="app-header"><div className="brand"><span className="brand-symbol">◈</span><div>CS2 <b>BROADCAST</b><small>比赛导播控制台</small></div><span className="version">MVP / 01</span></div>
    <div className="connection"><span className={`status-dot ${connected && state?.gsi_online ? 'online' : ''}`}/>{!connected ? '与服务器断开，正在重连' : state?.gsi_online ? 'GSI 实时连接' : '等待 GSI 数据'}<small>{since === null ? '尚未收到数据' : `${since} 秒前更新`}</small></div>
    <div className="header-stats"><span>{state?.map.display_name ?? '—'} <small>ROUND {state?.map.current_round ?? '—'}</small></span><span className="client-count">{clients.hud}<small>HUD 连接</small></span></div>
    <button disabled={!connected || !layout} className={`visibility-button ${layout?.hud_visible ? 'live' : ''}`} onClick={() => api('/layout/visibility', 'POST', { hud_visible: !layout?.hud_visible })}>{layout?.hud_visible ? '隐藏 HUD' : '显示 HUD'} <kbd>H</kbd></button></header>
    <div className="workspace"><aside className="sidebar"><div className="section-title"><h2>画面模块</h2><small>04 MODULES</small></div><fieldset disabled={!connected}>
      <div className="module-list">{Object.entries(registry).map(([id, spec], index) => <div key={id} className={`module-row ${selected === id ? 'active' : ''}`}><button onClick={() => select(id as ModuleId)}><span className="module-index">0{index + 1}</span>{spec.name}</button><input type="checkbox" aria-label={`${spec.name}可见`} checked={layout?.modules[id as ModuleId].visible ?? false} onChange={e => patchModule(id as ModuleId, { visible: e.target.checked })}/></div>)}</div>
      <div className="section-title team-section"><h2>队伍设置</h2><small>TEAM IDENTITY</small></div>
      {teams && <><div className="team-edit"><div className="team-label"><b>A 队</b><span className={teams.a_side.toLowerCase()}>{teams.a_side}</span><small>{teams.roster_counts?.A ?? 0} 名选手</small></div><Field label="队名" value={teams.a_name ?? ''} commit={v => updateTeam({ a_name: v.trim() || null })}/><Field label="简称" value={teams.a_short ?? ''} commit={v => updateTeam({ a_short: v.trim() || null })}/></div>
      <div className="team-edit"><div className="team-label"><b>B 队</b><span className={teams.a_side === 'CT' ? 't' : 'ct'}>{teams.a_side === 'CT' ? 'T' : 'CT'}</span><small>{teams.roster_counts?.B ?? 0} 名选手</small></div><Field label="队名" value={teams.b_name ?? ''} commit={v => updateTeam({ b_name: v.trim() || null })}/><Field label="简称" value={teams.b_short ?? ''} commit={v => updateTeam({ b_short: v.trim() || null })}/></div>
      <p className="hint">队名留空时使用游戏数据。</p><div className="button-row"><button onClick={() => api('/teams/swap')}>⇄ 交换阵营</button><button onClick={() => api('/teams/reset-roster')}>重新学习名单</button></div>
      <label className="setting-row">左侧队伍<select value={teams.left_slot} onChange={e => updateTeam({ left_slot: e.target.value as 'A' | 'B' })}><option value="A">A 队</option><option value="B">B 队</option></select></label><label className="setting-row">自动跟随换边<input type="checkbox" checked={teams.auto_swap} onChange={e => updateTeam({ auto_swap: e.target.checked })}/></label></>}
    </fieldset><div className="sidebar-footer"><span className="status-dot online"/> 本地导播工作站<small>GSI → FASTAPI → HUD</small></div></aside>
    <section className="editor-area"><div className="editor-heading"><div><p className="eyebrow">LAYOUT STUDIO</p><h1>把比赛放在中心。</h1><p>调整画面布局，实时同步至覆盖窗口。</p></div><Link className="secondary-link" to="/hud" target="_blank">打开 HUD 预览 ↗</Link></div>
    <div className="preview-toolbar"><div><span className={`status-dot ${state?.gsi_online ? 'online' : 'sample'}`}/>{state?.gsi_online ? '实时比赛画面' : '示例数据 · 仅用于布局预览'}</div><div><label className="upload-button">导入参考截图<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) setBackground(URL.createObjectURL(file)); e.target.value = ''; }}/></label>{background && <button onClick={() => setBackground(null)}>移除</button>}<span>16 : 9</span></div></div>
    <div className={!connected ? 'editor-disconnected' : ''}><LayoutEditor selected={selected} select={select} background={background}/></div>
    <div className="canvas-footer"><span>拖拽移动 · 右下角缩放 · Alt 关闭吸附</span><span>方向键 1 px <kbd>Shift</kbd> + 方向键 10 px</span></div>
    <fieldset disabled={!connected} className="property-panel"><div className="property-title"><span className="eyebrow">INSPECTOR</span><h2>{registry[selected].name}</h2></div>{m && <><Field label="X 位置" value={Math.round(m.x * 10) / 10} type="number" min={-500} max={2420} step={.1} commit={v => patchModule(selected, { x: clamp(Number(v), -500, 2420) })}/><Field label="Y 位置" value={Math.round(m.y * 10) / 10} type="number" min={-500} max={1580} step={.1} commit={v => patchModule(selected, { y: clamp(Number(v), -500, 1580) })}/><Field label="缩放" value={Math.round(m.scale * 100) / 100} type="number" min={.25} max={3} step={.05} commit={v => patchModule(selected, { scale: clampScale(Number(v)) })}/><Field label="图层 Z" value={m.z} type="number" min={-1000} max={1000} step={1} commit={v => patchModule(selected, { z: Number(v) })}/><label className="property-visible"><input type="checkbox" checked={m.visible} onChange={e => patchModule(selected, { visible: e.target.checked })}/> 可见</label></>}</fieldset>
    <div className="editor-bottom"><span>所有修改自动保存到本机</span><button disabled={!connected} className="text-button" onClick={() => setConfirmReset(true)}>恢复默认布局</button></div>
    </section></div>
    {error && <div className="toast" role="alert"><b>操作未完成</b><span>{error}</span><button onClick={() => useStore.setState({ error: null })}>×</button></div>}
    {confirmReset && <div className="modal-backdrop"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">恢复默认布局？</h2><p>模块的位置、缩放和显隐将恢复初始设置。</p><div className="button-row"><button onClick={() => setConfirmReset(false)}>取消</button><button disabled={!connected} className="primary" onClick={async () => { if (await api('/layout/reset')) setConfirmReset(false); }}>确认恢复</button></div></div></div>}
  </main>;
}
