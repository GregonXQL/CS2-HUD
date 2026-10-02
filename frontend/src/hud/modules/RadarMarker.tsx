import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { blendPose, shouldSnapPose, type RadarPose } from '../../lib/radar';

// Animate just SVG attributes, not the entire HUD React tree on every frame.
export function RadarMarker({ x, y, angle, color, opacity, children }: {
  x: number; y: number; angle: number | null; color: string; opacity: number; children: ReactNode;
}) {
  const group = useRef<SVGGElement>(null);
  const arrow = useRef<SVGPathElement>(null);
  const displayed = useRef<RadarPose | null>(null);
  const lastUpdate = useRef(0);
  useLayoutEffect(() => {
    const now = performance.now();
    const target = { x, y, angle: angle ?? 0 };
    const from = displayed.current;
    const elapsed = now - lastUpdate.current;
    lastUpdate.current = now;
    let frame = 0;
    function paint(pose: RadarPose) {
      displayed.current = pose;
      group.current?.setAttribute('transform', `translate(${pose.x} ${pose.y})`);
      arrow.current?.setAttribute('transform', `rotate(${pose.angle})`);
    }
    // New spawn/map/floor, large jumps and reconnects must not slide across the map.
    if (!from || shouldSnapPose(from, target, elapsed)) paint(target);
    else {
      const duration = Math.max(25, Math.min(75, elapsed));
      const step = (timestamp: number) => {
        const t = Math.min(1, (timestamp - now) / duration);
        paint(blendPose(from, target, t));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(frame);
  }, [x, y, angle]);
  return <g ref={group} opacity={opacity}>
    {angle !== null && <path ref={arrow} d="M8 -5 L18 0 L8 5Z" fill={color}/>}
    {children}
  </g>;
}
