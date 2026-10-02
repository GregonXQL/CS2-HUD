import { describe, expect, it } from 'vitest';
import { radarPoint, blendPose, shouldSnapPose } from './radar';
describe('overview projection', () => {
  const map = { pos_x: -3230, pos_y: 1713, scale: 5, image: '' };
  it('maps overview origin and far corner without stretching', () => {
    expect(radarPoint({ x: -3230, y: 1713, z: 0 }, map)).toEqual({ x: 0, y: 0 });
    expect(radarPoint({ x: 1890, y: -3407, z: 0 }, map)).toEqual({ x: 340, y: 340 });
  });
  it('uses fixed world coordinates independent of player bounds and height', () => {
    expect(radarPoint({ x: -670, y: -847, z: -500 }, map)).toEqual({ x: 170, y: 170 });
  });
});
describe('radar smoothing', () => {
  it('rotates across the angle boundary via the shortest arc', () => {
    const from = { x: 10, y: 20, angle: 179 }, to = { x: 30, y: 40, angle: -179 };
    expect(blendPose(from, to, .5)).toEqual({ x: 20, y: 30, angle: 180 });
    expect(blendPose(to, from, .5).angle).toBe(-180);
  });
  it('stops at the received position instead of extrapolating during data loss', () => {
    expect(blendPose({ x: 0, y: 0, angle: 0 }, { x: 10, y: 20, angle: 30 }, 5)).toEqual({ x: 10, y: 20, angle: 30 });
  });
  it('snaps after long gaps or teleports, but smooths ordinary movement', () => {
    const from = { x: 0, y: 0, angle: 0 };
    expect(shouldSnapPose(from, { ...from, x: 3 }, 25)).toBe(false);
    expect(shouldSnapPose(from, { ...from, x: 3 }, 300)).toBe(true);
    expect(shouldSnapPose(from, { ...from, x: 100 }, 25)).toBe(true);
  });
});
