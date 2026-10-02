import type { Position } from './types';
export interface Overview { pos_x: number; pos_y: number; scale: number; image: string; lowerImage?: string; lowerMax?: number }
export function radarPoint(position: Position, map: Overview) {
  return { x: (position.x - map.pos_x) / map.scale / 1024 * 340, y: (map.pos_y - position.y) / map.scale / 1024 * 340 };
}
export interface RadarPose { x: number; y: number; angle: number }
export function blendPose(from: RadarPose, to: RadarPose, fraction: number): RadarPose {
  const t = Math.max(0, Math.min(1, fraction));
  const turn = ((to.angle - from.angle) % 360 + 540) % 360 - 180;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, angle: from.angle + turn * t };
}
export function shouldSnapPose(from: RadarPose, to: RadarPose, elapsedMs: number) {
  return elapsedMs > 250 || Math.hypot(to.x - from.x, to.y - from.y) > 64;
}
