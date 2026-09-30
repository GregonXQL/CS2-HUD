export const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const clampScale = (n: number) => clamp(n, .25, 3);
export const toReference = (screen: number, scale: number) => screen / scale;
export const toScreen = (reference: number, scale: number) => reference * scale;
export function snapAxis(position: number, size: number, extent: number, disabled = false) {
  if (disabled) return position;
  const candidates = [0, (extent - size) / 2, extent - size];
  return candidates.find(target => Math.abs(target - position) <= 10) ?? position;
}
export function position(x: number, y: number, width: number, height: number, alt = false) {
  return { x: clamp(snapAxis(x, width, 1920, alt), -500, 2420), y: clamp(snapAxis(y, height, 1080, alt), -500, 1580) };
}
