import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Rnd } from 'react-rnd';
import { useStore } from '../lib/store';
import { patchModule } from '../lib/api';
import { position, clampScale } from '../lib/coords';
import { sampleData } from '../lib/sampleData';
import type { ModuleId, ModuleLayout } from '../lib/types';
import { registry } from '../hud/modules/registry';
import { HudModule } from '../hud/modules/Modules';
export function LayoutEditor({ selected, select, background }: { selected: ModuleId; select: (id: ModuleId) => void; background: string | null }) {
  const { layout, state } = useStore();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [draft, setDraft] = useState<ModuleLayout | null>(null);
  const lastSent = useRef(0);
  useEffect(() => { const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); if (container.current) observer.observe(container.current); return () => observer.disconnect(); }, []);
  const previewScale = width / 1920;
  const displayState = state?.gsi_online ? state : sampleData;
  function send(module: ModuleLayout, final = false) {
    setDraft(module);
    if (final || performance.now() - lastSent.current >= 1000 / 30) {
      lastSent.current = performance.now();
      patchModule(module.id, { x: module.x, y: module.y, scale: module.scale });
    }
    if (final) setDraft(null);
  }
  return <div ref={container} className="preview" style={{ height: width * 9 / 16, backgroundImage: background ? `url("${background}")` : undefined }}><div className="preview-reference" style={{ transform: `scale(${previewScale})` }}>
    <div className="safe-frame"/><span className="canvas-mark">1920 × 1080 · PROGRAM</span>
    {layout && Object.values(layout.modules).map(saved => {
      const m = draft?.id === saved.id ? draft : saved;
      const spec = registry[m.id];
      const updatePosition = (x: number, y: number, alt: boolean, final: boolean) => send({ ...m, ...position(x, y, spec.width * m.scale, spec.height * m.scale, alt) }, final);
      return <Rnd key={m.id} scale={previewScale} size={{ width: spec.width * m.scale, height: spec.height * m.scale }} position={{ x: m.x, y: m.y }}
        lockAspectRatio={spec.width / spec.height} minWidth={spec.width * .25} minHeight={spec.height * .25} maxWidth={spec.width * 3} maxHeight={spec.height * 3}
        enableResizing={{ bottomRight: true }} onDragStart={() => select(m.id)} onResizeStart={() => select(m.id)}
        onDrag={(e, d) => updatePosition(d.x, d.y, 'altKey' in e && e.altKey, false)}
        onDragStop={(e, d) => updatePosition(d.x, d.y, 'altKey' in e && e.altKey, true)}
        onResize={(_e, _dir, ref, _delta, pos) => send({ ...m, ...pos, scale: clampScale(parseFloat(ref.style.width) / spec.width) })}
        onResizeStop={(_e, _dir, ref, _delta, pos) => send({ ...m, ...pos, scale: clampScale(parseFloat(ref.style.width) / spec.width) }, true)}
        onMouseDown={() => select(m.id)} className={`editable-module ${selected === m.id ? 'selected' : ''} ${m.visible ? '' : 'module-hidden'}`}
        style={{ zIndex: m.z, '--preview-scale': previewScale } as CSSProperties}>
        {selected === m.id && <span className="selection-label">{spec.name}</span>}
        <div style={{ width: spec.width, height: spec.height, transform: `scale(${m.scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}><HudModule id={m.id} state={displayState}/></div>
      </Rnd>;
    })}
  </div></div>;
}
