// Verify the desktop launcher's lifecycle using the assembled release resources.
const { app } = require('electron');
const path = require('node:path');
app.setPath('userData', path.resolve(__dirname, '../build/launcher-profile'));
Object.defineProperty(process, 'resourcesPath', { value: path.resolve(__dirname, '../release/win-unpacked/resources') });
const { startBackend, stopBackend } = require('../dist/backend.js');
app.whenReady().then(async () => {
  try {
    const url = await startBackend();
    const health = await (await fetch(`${url}/api/health`)).json();
    if (health.desktop_parent_pid !== String(process.pid)) throw new Error('Wrong backend owner');
    const maps = await (await fetch(`${url}/maps/manifest.json`)).json();
    if (Object.keys(maps).length !== 10 || !maps.de_cache || !maps.de_nuke.lowerImage) throw new Error('Release map assets missing');
    const html = await (await fetch(`${url}/control`)).text();
    if (!html.includes('assets/index-')) throw new Error('Release frontend missing');
    stopBackend();
    await new Promise(r => setTimeout(r, 1000));
    let alive = false;
    try { alive = (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) })).ok; } catch {}
    if (alive) throw new Error('Backend did not stop');
    require('node:fs').writeFileSync(path.resolve(__dirname, '../build/launcher-smoke.json'), JSON.stringify({ ownedBackend: true, maps: Object.keys(maps).length, frontend: true, stopped: true }));
    app.exit(0);
  } catch (error) { stopBackend(); console.error(error); app.exit(1); }
});
