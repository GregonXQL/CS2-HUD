import type { Player } from './types';

export function playersForPanel(players: Player[], right: boolean): Player[] {
  const start = right ? 5 : 0;
  return players.filter(p => p.observer_slot !== null && Number.isInteger(p.observer_slot)
    && p.observer_slot >= start && p.observer_slot < start + 5)
    .sort((a, b) => a.observer_slot! - b.observer_slot! || a.steamid.localeCompare(b.steamid)).slice(0, 5);
}
