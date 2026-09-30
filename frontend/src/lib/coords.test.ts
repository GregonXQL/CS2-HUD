import { describe, expect, it } from 'vitest';
import { toReference, toScreen, snapAxis, clampScale, position } from './coords';
describe('参考画布坐标', () => {
  it('屏幕与参考坐标互换，包括 1440p', () => {
    for (const scale of [.5, 1, 2560 / 1920]) expect(toReference(toScreen(660, scale), scale)).toBeCloseTo(660);
  });
  it('吸附边缘、中线，Alt 关闭', () => {
    expect(snapAxis(8, 420, 1920)).toBe(0);
    expect(snapAxis(745, 420, 1920)).toBe(750);
    expect(snapAxis(1495, 420, 1920)).toBe(1500);
    expect(snapAxis(1495, 420, 1920, true)).toBe(1495);
    expect(snapAxis(90, 420, 1920)).toBe(90);
  });
  it('坐标与缩放限制', () => {
    expect(clampScale(.1)).toBe(.25); expect(clampScale(4)).toBe(3);
    expect(position(-600, 1700, 600, 90)).toEqual({ x: -500, y: 1580 });
  });
});
