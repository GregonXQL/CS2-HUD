export function pickDisplay<T extends { id: number }>(displays: T[], primary: T, id: number | null): T {
  return displays.find(display => display.id === id) ?? primary;
}
