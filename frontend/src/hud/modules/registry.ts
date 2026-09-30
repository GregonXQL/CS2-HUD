import type { ModuleId } from '../../lib/types';
export const registry: Record<ModuleId, { name: string; width: number; height: number }> = {
  scoreboard: { name: '顶部比分条', width: 600, height: 90 },
  team_left: { name: '左侧队伍', width: 420, height: 380 },
  team_right: { name: '右侧队伍', width: 420, height: 380 },
  observed_player: { name: '当前观察选手', width: 560, height: 110 },
};
