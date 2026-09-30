import fs from 'node:fs';
import path from 'node:path';
export interface Config { backend_url: string; display_id: number | null; hotkeys: { toggle: string; reload: string }; disable_gpu: boolean }
const defaults: Config = { backend_url: 'http://127.0.0.1:8000', display_id: null, hotkeys: { toggle: 'Ctrl+Shift+H', reload: 'Ctrl+Shift+R' }, disable_gpu: false };
export function loadConfig(file: string): Config {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    const url = new URL(value.backend_url ?? defaults.backend_url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('backend_url 必须为 HTTP 地址');
    return { backend_url: url.origin, display_id: typeof value.display_id === 'number' ? value.display_id : null,
      disable_gpu: value.disable_gpu === true, hotkeys: {
        toggle: typeof value.hotkeys?.toggle === 'string' ? value.hotkeys.toggle : defaults.hotkeys.toggle,
        reload: typeof value.hotkeys?.reload === 'string' ? value.hotkeys.reload : defaults.hotkeys.reload,
      } };
  } catch (error) {
    if (fs.existsSync(file)) { console.error('配置无法读取，使用默认值', error); return structuredClone(defaults); }
    saveConfig(file, defaults);
    return structuredClone(defaults);
  }
}
export function saveConfig(file: string, value: Config) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2));
  fs.renameSync(file + '.tmp', file);
}
