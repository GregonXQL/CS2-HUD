import { app } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let child: ChildProcess | undefined;
export function stopBackend() { child?.kill(); child = undefined; }
export async function startBackend(): Promise<string> {
  const root = app.getPath('userData');
  const resource = process.resourcesPath;
  fs.mkdirSync(root, { recursive: true });
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) fs.copyFileSync(path.join(resource, 'backend.env'), envFile);
  const log = fs.openSync(path.join(root, 'backend.log'), 'a');
  let failure: Error | undefined;
  try {
    child = spawn(path.join(resource, 'backend', 'CS2BroadcastBackend.exe'), [], {
      cwd: root, windowsHide: true, stdio: ['ignore', log, log],
      env: { ...process.env, HOST: '127.0.0.1', PORT: '8000', DATA_DIR: path.join(root, 'data'),
        FRONTEND_DIST: path.join(resource, 'frontend'), DESKTOP_PARENT_PID: String(process.pid) },
    });
  } finally { fs.closeSync(log); }
  child.once('error', error => { failure = error; });
  child.once('exit', code => { failure = new Error(`内置后端退出 (${code})，请检查 backend.log；8000 端口可能已被占用。`); });
  const url = 'http://127.0.0.1:8000';
  for (let i = 0; i < 100; i++) {
    if (failure) throw failure;
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
      const result = await response.json();
      // Do not silently attach to another application's server on the same port.
      if (result.desktop_parent_pid === String(process.pid)) return url;
    } catch { /* Wait for the bundled server to become ready. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  stopBackend();
  throw new Error('内置后端启动超时，请检查应用数据目录中的 backend.log。');
}
