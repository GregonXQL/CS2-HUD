import { app, BrowserWindow, screen, Tray, Menu, nativeImage, globalShortcut, Notification, dialog } from 'electron';
import path from 'node:path';
import { loadConfig, saveConfig } from './config';
import { pickDisplay } from './displays';
import { startBackend, stopBackend } from './backend';

app.setName('cs2-broadcast-overlay');
app.setPath('userData', app.commandLine.getSwitchValue('user-data-dir') || path.join(app.getPath('appData'), 'cs2-broadcast-overlay'));
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  const configFile = path.join(app.getPath('userData'), 'config.json');
  const config = loadConfig(configFile);
  if (config.disable_gpu) app.disableHardwareAcceleration();
  let win: BrowserWindow | null = null;
  let control: BrowserWindow | null = null;
  let controlRetry: ReturnType<typeof setTimeout> | undefined;
  let tray: Tray;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let keepTop: ReturnType<typeof setInterval> | undefined;
  let quitting = false, toggling = false, connected = false;
  let hudUrl = process.env.OVERLAY_URL ?? `${config.backend_url}/hud?overlay=1`;
  function updateOverlayVisibility() {
    if (!win || !connected || quitting) return;
    const editingOnHudDisplay = control?.isFocused() && screen.getDisplayMatching(control.getBounds()).id === screen.getDisplayMatching(win.getBounds()).id;
    if (editingOnHudDisplay) win.hide();
    else win.showInactive();
  }
  function openControl() {
    if (control) { control.show(); control.focus(); return; }
    const url = process.env.CONTROL_URL ?? (process.env.OVERLAY_URL ? new URL('/control', process.env.OVERLAY_URL).href : `${config.backend_url}/control`);
    control = new BrowserWindow({ title: 'CS2 导播控制台', width: 1500, height: 940, minWidth: 1280, minHeight: 720,
      backgroundColor: '#11151d', autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    control.webContents.setWindowOpenHandler(({ url: target }) => {
      const parsed = new URL(target);
      if (parsed.origin === new URL(url).origin && parsed.pathname === '/hud') {
        const preview = new BrowserWindow({ title: 'HUD 预览', width: 1280, height: 720, backgroundColor: '#18202b', autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
        preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        preview.webContents.on('will-navigate', (event, next) => { if (new URL(next).origin !== parsed.origin) event.preventDefault(); });
        void preview.loadURL(target);
      }
      return { action: 'deny' };
    });
    control.webContents.on('will-navigate', (event, target) => { if (new URL(target).origin !== new URL(url).origin) event.preventDefault(); });
    const loadControl = () => { if (!quitting && control) void control.loadURL(url).catch(() => {}); };
    control.webContents.on('did-fail-load', (_e, code, _d, _u, main) => {
      if (main && code !== -3 && !quitting) { clearTimeout(controlRetry); controlRetry = setTimeout(loadControl, 3000); }
    });
    control.webContents.on('did-finish-load', () => clearTimeout(controlRetry));
    control.on('focus', updateOverlayVisibility);
    control.on('blur', updateOverlayVisibility);
    control.on('closed', () => { clearTimeout(controlRetry); control = null; });
    loadControl();
  }
  const notify = (body: string) => { if (Notification.isSupported()) new Notification({ title: 'CS2 导播覆盖窗口', body }).show(); };
  async function toggle() {
    if (toggling) return;
    toggling = true;
    try {
      const current = await fetch(`${config.backend_url}/api/layout`, { signal: AbortSignal.timeout(2500) });
      if (!current.ok) throw new Error('无法读取布局');
      const layout = await current.json();
      const response = await fetch(`${config.backend_url}/api/layout/visibility`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hud_visible: !layout.hud_visible }), signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error('无法更新 HUD');
    } catch { notify('无法连接后端，请检查服务是否启动。'); }
    finally { toggling = false; }
  }
  function menu() {
    if (!tray) return;
    tray.setToolTip(`CS2 导播覆盖窗口 · ${connected ? '已连接' : '未连接'}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: connected ? 'HUD 页面已连接' : '未连接，正在重试…', enabled: false },
      { label: '选择显示器', submenu: screen.getAllDisplays().map((display, index) => ({
        label: `显示器 ${index + 1} · ${display.size.width} × ${display.size.height} (${display.id})`, type: 'radio' as const,
        checked: pickDisplay(screen.getAllDisplays(), screen.getPrimaryDisplay(), config.display_id).id === display.id,
        click: () => { config.display_id = display.id; saveConfig(configFile, config); reposition(); },
      })) },
      { type: 'separator' },
      { label: '显示 / 隐藏 HUD', accelerator: config.hotkeys.toggle, click: () => void toggle() },
      { label: '重新加载 HUD', accelerator: config.hotkeys.reload, click: () => load() },
      { label: '打开控制面板', click: openControl },
      { type: 'separator' }, { label: '退出', click: () => app.quit() },
    ]));
  }
  function reposition() {
    const display = pickDisplay(screen.getAllDisplays(), screen.getPrimaryDisplay(), config.display_id);
    win?.setBounds(display.bounds);
    menu();
  }
  function load() {
    if (quitting || !win) return;
    clearTimeout(retry);
    void win.loadURL(hudUrl).catch(() => { /* did-fail-load schedules the retry. */ });
  }
  app.whenReady().then(async () => {
    if (app.isPackaged) {
      try { config.backend_url = await startBackend(); hudUrl = `${config.backend_url}/hud?overlay=1`; }
      catch (error) { dialog.showErrorBox('CS2 导播启动失败', String(error)); app.quit(); return; }
    }
    const display = pickDisplay(screen.getAllDisplays(), screen.getPrimaryDisplay(), config.display_id);
    if (config.display_id === null) { config.display_id = display.id; saveConfig(configFile, config); }
    win = new BrowserWindow({ ...display.bounds, transparent: true, backgroundColor: '#00000000', frame: false,
      resizable: false, movable: false, focusable: false, skipTaskbar: true, hasShadow: false, fullscreenable: false,
      alwaysOnTop: true, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setVisibleOnAllWorkspaces(true);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== new URL(hudUrl).origin) event.preventDefault(); });
    win.webContents.on('did-finish-load', () => { connected = true; clearTimeout(retry); updateOverlayVisibility(); menu(); });
    win.webContents.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
      if (!mainFrame || code === -3 || quitting) return;
      connected = false; win?.hide(); menu(); clearTimeout(retry); retry = setTimeout(load, 3000);
    });
    win.webContents.on('render-process-gone', () => { connected = false; win?.hide(); menu(); clearTimeout(retry); retry = setTimeout(load, 3000); });
    const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
    tray = new Tray(icon); menu();
    tray.on('double-click', openControl);
    for (const [accelerator, action] of [[config.hotkeys.toggle, () => void toggle()], [config.hotkeys.reload, load]] as const) {
      try { if (!globalShortcut.register(accelerator, action)) notify(`快捷键 ${accelerator} 注册失败，可能已被占用。`); }
      catch { notify(`快捷键 ${accelerator} 无效，请修改配置文件。`); }
    }
    keepTop = setInterval(() => { updateOverlayVisibility(); if (win?.isVisible()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } }, 2000);
    screen.on('display-added', reposition); screen.on('display-removed', reposition); screen.on('display-metrics-changed', reposition);
    load();
    openControl();
  });
  app.on('second-instance', () => { if (app.isReady()) openControl(); });
  app.on('before-quit', () => { quitting = true; clearTimeout(retry); clearTimeout(controlRetry); clearInterval(keepTop); stopBackend(); globalShortcut.unregisterAll(); tray?.destroy(); });
  app.on('window-all-closed', () => app.quit());
}
