import type { Position } from './types';
export interface Overview { pos_x: number; pos_y: number; scale: number; image: string; lowerImage?: string; lowerMax?: number }
export function radarPoint(position: Position, map: Overview) {
  return { x: (position.x - map.pos_x) / map.scale / 1024 * 340, y: (map.pos_y - position.y) / map.scale / 1024 * 340 };
}
