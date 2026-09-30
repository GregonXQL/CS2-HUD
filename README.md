# CS2 Broadcast MVP

基于官方 GSI 的本地 CS2 比赛导播系统：FastAPI 接收比赛状态，React 提供 HUD 与中文控制台，Electron 将透明 HUD 覆盖在游戏显示器上。

**CS2 必须使用「全屏窗口化」或「窗口化」。独占全屏无法显示外部覆盖窗口。** 需要以 GOTV、服务器观察位或 `playdemo` 观战才能获得全部 10 名选手。普通玩家视角只显示比分和当前玩家。

## 安装

需要 Python 3.11+、Node.js 20.19+（或 22.12+）。正式运行只需 Python 与已打包的覆盖窗口，无需 Node.js。下面命令均从仓库根目录开始。

Windows PowerShell：

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -e "./backend[dev]"
Copy-Item backend/.env.example backend/.env
npm ci --prefix frontend
npm ci --prefix overlay
npm run build --prefix frontend
```

macOS / Linux 开发：

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e './backend[dev]'
cp backend/.env.example backend/.env
npm ci --prefix frontend
npm ci --prefix overlay
npm run build --prefix frontend
```

如果使用默认禁止依赖安装脚本的新版 npm，需运行 `npm install-scripts approve electron electron-winstaller --prefix overlay` 与 `npm rebuild --prefix overlay`，允许 Electron 下载运行时。前端 esbuild 可用 `npm install-scripts approve esbuild --prefix frontend` 后重新安装。普通 Node 20/22 自带 npm 不需要这一步。

## 启动与模拟比赛

已构建前端后，在一个终端运行后端即可访问两个页面：

```powershell
cd backend
.venv/Scripts/python -m app.main
```

macOS/Linux 对应 `cd backend && .venv/bin/python -m app.main`。

- 控制台：<http://localhost:8000/control>
- 浏览器 HUD：<http://localhost:8000/hud>
- API 文档：<http://localhost:8000/docs>
- 局域网其他设备：`http://本机局域网IP:8000/control`。Windows 防火墙按需允许私有网络 TCP 8000；控制台无登录，仅用于可信局域网。

没有 CS2 时，在第二个终端从根目录发送模拟数据：

```bash
python backend/tools/gsi_simulator.py --scenario full_match --hz 10 --loop
```

默认每个场景 8 秒，包括热身、准备阶段、伤害/击杀、安包/拆弹、爆炸、回合结束、中场换边、暂停、切换观察、比赛结束和非观战模式。`--speed 2` 加速两倍；`--scenario halftime_swap` 可单独验证换边（应先发送一次 `live_round` 学习名单）；`--token` 必须与 `.env` 一致。`full_match` 是功能场景串联，不模拟完整的竞技计分规则。

控制台没有在线数据时显示带标识的内置示例，仅供布局编辑，不向真正的 HUD 发送虚构比赛数据。离线的浏览器 HUD 显示占位；覆盖窗口自动淡出。

## 连接 CS2 与启动覆盖窗口

1. 修改 `backend/.env` 的 `GSI_TOKEN`，并同步修改 `cfg/gamestate_integration_cs2broadcast.cfg` 的 `auth.token`。
2. 将 cfg 复制到 `...\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\`，重启 CS2。
3. CS2 设置「全屏窗口化」，进入观战或在控制台运行 `playdemo <demo名>`。
4. 启动后端，然后运行 `CS2BroadcastOverlay.exe`（或开发时 `cd overlay && npm run dev`）。
5. 托盘菜单「选择显示器」选中游戏所在屏幕。在浏览器 `/control` 编辑布局。

覆盖窗口无边框、透明、置顶、点击穿透，不注入游戏或读取游戏内存。快捷键 `Ctrl+Shift+H` 同步切换所有 HUD 显隐，`Ctrl+Shift+R` 重载当前覆盖窗口。通过托盘菜单退出。

配置首次生成于 `%APPDATA%/cs2-broadcast-overlay/config.json`（macOS/Linux 使用 Electron 对应 appData 路径）：

```json
{
  "backend_url": "http://127.0.0.1:8000",
  "display_id": null,
  "hotkeys": { "toggle": "Ctrl+Shift+H", "reload": "Ctrl+Shift+R" },
  "disable_gpu": false
}
```

程序启动后会保存主显示器 ID；目标显示器断开时临时回落到主显示器。个别显卡有黑底时，将 `disable_gpu` 改为 `true` 并重启覆盖窗口。后端不可达时窗口不显示错误页，每 3 秒重试；已加载页面通过 WebSocket 自动重连。

## 布局与队伍

- 1920×1080 参考画布等比适配输出屏幕。拖拽模块、右下角等比缩放；距边缘/中心 10px 内吸附，按 Alt 暂时关闭。
- 方向键微调 1px，Shift + 方向键 10px；输入框聚焦时不触发快捷键。`H` 切换整体显隐。
- 隐藏模块在编辑器以虚线和低透明度显示。截图背景只保留于当前浏览器内存。
- 修改自动保存至 `backend/data/layout.json`、`teams.json`。默认布局恢复需要界面二次确认。
- A/B 是固定队伍身份，首次 live 观战快照以 CT 为 A、T 为 B 学习名单；根据至少 3 名 A 队成员阵营跟随换边，左右由设置控制。
- 手动交换不会被相同名单快照立即覆盖；后续实际名单阵营改变仍可触发自动判断。需要固定手动配置时关闭「自动跟随换边」。新比赛或新名单请点击「重新学习名单」。名单本身不落盘。

## 开发、测试、打包

```bash
# 后端测试（Windows 使用 .venv/Scripts/python）
cd backend
.venv/bin/python -m pytest

# 前端坐标测试与生产构建
cd frontend
npm test
npm run build

# 覆盖窗口 TypeScript 检查和 Windows x64 便携包
cd overlay
npm run build
npm run dist
```

后端运行时，可另执行 `cd backend && .venv/bin/python tools/smoke_test.py`，检查真实 HTTP/WebSocket 链路、双客户端同步延迟与换边。该脚本临时修改布局并在结束时恢复；比赛状态会替换为模拟数据，请勿在正式比赛期间执行。

输出：`overlay/release/CS2BroadcastOverlay.exe`。推荐在 Windows 上打包；其他系统交叉打包需要 electron-builder 的相应工具与下载权限。便携 exe 未签名。

一键开发：Windows `./scripts/dev.ps1 -Overlay`；macOS/Linux `./scripts/dev.sh --overlay`。省略 Overlay 参数只启动 FastAPI 与 Vite。开发入口是 `http://localhost:5173/control`，Vite 代理 `/api` 与 `/ws`。开发覆盖窗口通过 `OVERLAY_URL` 加载 Vite。构建脚本为 `scripts/build.ps1` / `scripts/build.sh`。

后端必须单进程运行（不能使用多个 uvicorn workers），因为比赛、名单、连接状态均在内存中。路径配置相对于 backend 工作目录，详见 `.env.example`。

设置 `GSI_RECORD=true` 会将原始帧保存到 `backend/data/recordings/*.jsonl`；使用 `--replay 路径.jsonl --hz 10` 按指定帧率回放，`--speed` 调整速度。录制含原始 auth token，不要公开分享。`/api/debug/raw` 会移除 auth 字段。

协议遵循 PRD，增加 `MatchState.observed_player` 以支持无 allplayers 的观察面板、`teams.roster_counts` 用于名单人数显示，以及 `clients` WebSocket 消息用于实时连接数。布局仅包含 P0 的四个模块。P1 布局预设、Logo 和回合历史模块未实现。

配置中的 MR12/MR3 参数保留用于后续比赛制式展示；本 MVP 使用 GSI 原始比分/回合数，不根据回合数推断换边。

## 验收边界

自动化测试覆盖 GSI 容错、身份换边、鉴权、布局持久化、WebSocket 同步/节流/心跳及坐标吸附。Windows 真机仍需验证：游戏前台快捷键、透明背景、点击穿透、Alt+Tab 置顶保持、多显示器切换，以及 1080p/1440p 画布一致性和端到端 <200ms 同步。

参考：[PRD](docs/CS2%20导播系统%20PRD（GSI%20%2B%20FastAPI%20%2B%20React）.md)、[Electron 窗口 API](https://www.electronjs.org/docs/latest/api/browser-window)、[FastAPI WebSocket](https://fastapi.tiangolo.com/advanced/websockets/)。
