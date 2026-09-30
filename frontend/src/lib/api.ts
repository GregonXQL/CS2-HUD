import { useStore } from './store';
import type { ModuleId, ModuleLayout } from './types';
export async function api(path: string, method = 'POST', body?: unknown) {
  try {
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error?.message ?? `请求失败 (${response.status})`);
    return value;
  } catch (error) {
    useStore.setState({ error: error instanceof Error ? error.message : '网络请求失败' });
    return null;
  }
}
// Serialize and coalesce per-module updates so a slow drag request cannot overwrite its final position.
const pending = new Map<ModuleId, Partial<ModuleLayout>>();
const running = new Set<ModuleId>();
export function patchModule(id: ModuleId, value: Partial<ModuleLayout>) {
  pending.set(id, { ...pending.get(id), ...value });
  if (running.has(id)) return;
  running.add(id);
  void (async () => {
    try {
      while (pending.has(id)) {
        const next = pending.get(id); pending.delete(id);
        await api(`/layout/modules/${id}`, 'PATCH', next);
      }
    } finally { running.delete(id); }
  })();
}
