import { expect, it } from 'vitest';
import { playersForPanel } from './playerOrder';
import { sampleData } from './sampleData';

it('fixes panel membership and order by observer number, independent of team or array order', () => {
  const players = [...sampleData.players].reverse().map(p => ({ ...p, team_slot: p.team_slot === 'A' ? 'B' as const : 'A' as const }));
  expect(playersForPanel(players, false).map(p => p.observer_slot)).toEqual([0, 1, 2, 3, 4]);
  expect(playersForPanel(players, true).map(p => p.observer_slot)).toEqual([5, 6, 7, 8, 9]);
});
it('moves a renumbered player and leaves unknown numbers out of both panels', () => {
  const players = sampleData.players.map(p => ({ ...p, observer_slot: p.observer_slot === 0 ? 9 : p.observer_slot === 9 ? 0 : null }));
  expect(playersForPanel(players, false).map(p => p.steamid)).toEqual(['9']);
  expect(playersForPanel(players, true).map(p => p.steamid)).toEqual(['0']);
  const invalid = [-1, 10, 1.5].map(observer_slot => ({ ...players[0], observer_slot }));
  expect(playersForPanel(invalid, false)).toEqual([]);
  expect(playersForPanel(invalid, true)).toEqual([]);
});
