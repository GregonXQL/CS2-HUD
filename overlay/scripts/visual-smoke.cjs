// Hidden render check against an isolated backend; never connects to a live match.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.setPath('userData', path.resolve(__dirname, '../build/visual-profile'));
app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({ width: 1600, height: 1100, show: false, backgroundColor: '#18202b', webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false, offscreen: true } });
    win.webContents.setFrameRate(60);
    await win.loadURL('http://127.0.0.1:18080/control');
    await new Promise(r => setTimeout(r, 2000));
    await win.webContents.executeJavaScript(`Promise.all([...document.images].map(img => img.decode()))`);
    const result = await win.webContents.executeJavaScript(`({ cards: document.querySelectorAll('.player-card').length, radar: document.querySelector('.radar img')?.naturalWidth > 0, icons: document.querySelectorAll('.utility-icons svg').length, text: document.body.innerText.includes('小地图') })`);
    if (result.cards !== 10 || !result.radar || result.icons < 10 || !result.text) throw new Error(JSON.stringify(result));
    const weapons = await win.webContents.executeJavaScript(`({ cards: [...document.querySelectorAll('.player-card .weapon-icon')].filter(img => img.naturalWidth > 0).length, observed: document.querySelector('.observed-panel .weapon-icon')?.naturalWidth > 0 })`);
    if (weapons.cards !== 10 || !weapons.observed) throw new Error(`Weapon images: ${JSON.stringify(weapons)}`);
    await win.webContents.executeJavaScript(`(async () => { const names = await (await fetch('/weapons/manifest.json')).json(); await Promise.all(names.map(async name => { const img = new Image(); img.src = '/weapons/' + name + '.svg'; await img.decode(); if (!img.naturalWidth) throw new Error(name); })); })()`);
    const panels = await win.webContents.executeJavaScript(`({ numbers: [...document.querySelectorAll('.team-panel')].map(panel => [...panel.querySelectorAll('.slot-number')].map(n => n.textContent).join(',')), manual: !!document.querySelector('.sidebar select') || /交换阵营|自动跟随换边/.test(document.querySelector('.sidebar').innerText) })`);
    if (panels.numbers.join('|') !== '1,2,3,4,5|6,7,8,9,0' || panels.manual) throw new Error(`Panel order: ${JSON.stringify(panels)}`);
    const motion = await win.webContents.executeJavaScript(`(async () => {
      const raw = await (await fetch('/api/debug/raw')).json();
      raw.auth = { token: 'desktop-smoke' };
      const player = Object.values(raw.allplayers)[0];
      const pos = player.position.split(',').map(Number); pos[0] += 1;
      player.position = pos.join(',');
      // First update after idling intentionally snaps; the next update must interpolate.
      await fetch('/api/gsi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) });
      await new Promise(resolve => setTimeout(resolve, 100));
      pos[0] += 120; player.position = pos.join(',');
      const marker = document.querySelector('.radar svg > g');
      const positions = new Set([marker.getAttribute('transform')]);
      await fetch('/api/gsi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) });
      const start = performance.now();
      await new Promise(resolve => { const frame = () => { positions.add(marker.getAttribute('transform')); if (performance.now() - start < 200) requestAnimationFrame(frame); else resolve(); }; requestAnimationFrame(frame); });
      return positions.size;
    })()`);
    if (motion < 3) throw new Error(`Radar did not render intermediate positions: ${motion}`);
    fs.writeFileSync(path.resolve(__dirname, '../build/control-smoke.png'), (await win.webContents.capturePage()).toPNG());
    await win.loadURL('http://127.0.0.1:18080/hud');
    await new Promise(r => setTimeout(r, 1200));
    fs.writeFileSync(path.resolve(__dirname, '../build/hud-smoke.png'), (await win.webContents.capturePage()).toPNG());
    console.log('Render smoke passed:', JSON.stringify(result));
    app.exit(0);
  } catch (error) { fs.writeFileSync(path.resolve(__dirname, '../build/visual-smoke-error.log'), String(error.stack ?? error)); console.error(error); app.exit(1); }
});
