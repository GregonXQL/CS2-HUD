import { create } from 'zustand';
import type { HudLayout, MatchState, TeamSettings } from './types';
interface Store {
  connected: boolean; state: MatchState | null; layout: HudLayout | null; teams: TeamSettings | null;
  receivedAt: number; clients: { hud: number; control: number }; error: string | null;
}
export const useStore = create<Store>(() => ({ connected: false, state: null, layout: null, teams: null, receivedAt: performance.now(), clients: { hud: 0, control: 0 }, error: null }));
