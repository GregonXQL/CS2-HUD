// Hidden render check against an isolated backend; never connects to a live match.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.setPath('userData', path.resolve(__dirname, '../build/visual-profile'));
app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({ width: 1600, height: 1100, show: false, backgroundColor: '#18202b', webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false } });
    await win.loadURL('http://127.0.0.1:18080/control');
    await new Promise(r => setTimeout(r, 2000));
    await win.webContents.executeJavaScript(`Promise.all([...document.images].map(img => img.decode()))`);
    const result = await win.webContents.executeJavaScript(`({ cards: document.querySelectorAll('.player-card').length, radar: document.querySelector('.radar img')?.naturalWidth > 0, icons: document.querySelectorAll('.utility-icons svg').length, text: document.body.innerText.includes('小地图') })`);
    if (result.cards !== 10 || !result.radar || result.icons < 10 || !result.text) throw new Error(JSON.stringify(result));
    fs.writeFileSync(path.resolve(__dirname, '../build/control-smoke.png'), (await win.webContents.capturePage()).toPNG());
    await win.loadURL('http://127.0.0.1:18080/hud');
    await new Promise(r => setTimeout(r, 1200));
    fs.writeFileSync(path.resolve(__dirname, '../build/hud-smoke.png'), (await win.webContents.capturePage()).toPNG());
    console.log('Render smoke passed:', JSON.stringify(result));
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
