import { describe, expect, it } from 'vitest';
import { radarPoint } from './radar';
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
