# CS2 Broadcast

本地 CS2 比赛导播工具：GSI 接收数据，独立桌面控制台编辑布局，透明覆盖窗口显示 HUD。不注入游戏、不读取游戏内存。

## Windows 使用

1. 双击 `overlay/release/CS2BroadcastOverlay.exe`，自动启动内置后端、桌面控制台和透明 HUD。无需 Python/Node，无需浏览器。首次解压启动稍慢。
2. 将 `cfg/` 的三个 cfg 复制到 `Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg/`，重启 CS2。GSI 配置会自动加载。
3. CS2 使用**全屏窗口化**或窗口化，进入 GOTV、观察位或 `playdemo`。完整小地图需要观战 GSI 提供所有选手坐标。
4. 游戏控制台运行 `exec broadcast_hud`，隐藏常规原生 HUD、雷达和头顶队友标记，保留右上角击杀信息和白色静态准星（大小 5，不显示扩散、不跟随后坐力、不随武器改变间距）。准星使用本机配置，不跟随被观察选手。`exec broadcast_hud_restore` 恢复常规 HUD 和观察选手准星；本机准星样式保留白色，需要时加载自己的准星 cfg。
5. 桌面控制台可调整五个模块的位置、缩放和显隐。托盘菜单可选择显示器、重新打开控制台或退出。

`Ctrl+Shift+H` 切换 HUD，`Ctrl+Shift+R` 重载覆盖层。关闭控制台后 HUD 继续运行，托盘“退出”会结束内置后端。启动桌面版前停止旧独立后端，避免占用 8000 端口。

## 小地图与道具

- 内置 Mirage、Inferno、Dust2、Ancient、Anubis、Nuke、Overpass、Train、Vertigo、Cache 十张离线底图。
- 显示存活选手编号、阵营、朝向、观察高亮、C4 携带/落点/安放位置。按 overview 固定坐标换算。
- GSI 使用 `buffer=0`、`throttle=0.025`，后端默认上限 40Hz；实际频率取决于游戏提供数据的速度。位置和朝向按屏幕帧平滑过渡，断流不预测移动，跨楼层/换回合/大幅跳点直接定位。
- 升级后需重新复制 `gamestate_integration_cs2broadcast.cfg` 到游戏 cfg 目录并重启 CS2。旧 `.env` 如显式设置 `STATE_MAX_HZ=20`，改为 `40` 后重启程序。
- Nuke、Train、Vertigo 按观察选手高度切换楼层，另一层选手降低透明度。
- 未知地图、缺失坐标显示提示，不伪造位置。地图更新后可运行 `backend/.venv/Scripts/python scripts/fetch-radars.py` 刷新成套资源，再重新打包。
- 每位选手姓名旁显示闪光、烟雾、高爆、燃烧瓶/燃烧弹、诱饵及 C4 图标，双闪按数量显示。保留护甲、头盔和拆弹器。图标为本地 SVG。

## 数据和配置

桌面数据目录：`%APPDATA%/cs2-broadcast-overlay/`。

| 文件 | 用途 |
| --- | --- |
| `config.json` | 显示器、快捷键和 GPU；backend_url 仅供开发版连接外部后端 |
| `.env` | GSI_TOKEN；首次从打包时的 cfg 初始化，升级不覆盖 |
| `data/layout.json`、`data/teams.json` | 布局和队伍设置 |
| `backend.log` | 后端运行日志 |

修改 token 时，同步修改该目录 `.env` 和游戏里的 GSI cfg，然后重启程序和 CS2。打包不包含开发用的 `backend/.env`、比赛录制或私人数据。

迁移旧布局：退出程序，将 `backend/data/layout.json`、`teams.json` 复制到上述数据目录的 `data/`。四模块旧布局自动补上小地图，保留已有设置。桌面服务仅监听 `127.0.0.1:8000`；界面在 Electron 独立窗口中运行，内部复用 React 和本地 HTTP/WebSocket。

## 开发与打包

构建需要 Windows、Python 3.11+、Node.js 20.19+ 或 22.12+。发布 EXE 的用户无需这些环境。

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -e "./backend[dev,build]"
Copy-Item backend/.env.example backend/.env  # 首次配置；已有文件不要覆盖
npm ci --prefix frontend
npm ci --prefix overlay
./scripts/build.ps1
```

输出：`overlay/release/CS2BroadcastOverlay.exe`。`npm run dist --prefix overlay` 也会重建前端和后端，打包工具首次可能下载 Electron/NSIS。

开发：`./scripts/dev.ps1 -Overlay` 启动后端、Vite 和桌面窗口。`/control`、`/hud` 保留供浏览器调试。macOS/Linux 可使用 `scripts/dev.sh --overlay`；完整 EXE 在 Windows 打包，`scripts/build.sh` 仅编译前端和 Electron。

```powershell
backend/.venv/Scripts/python -m pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
npm run build --prefix overlay
# 后端打包后：隔离端口 18080，隐藏窗口截图检查
backend/.venv/Scripts/python backend/tools/desktop_smoke.py
# TOKEN 改为实际配置；勿在正式比赛时发送模拟数据
backend/.venv/Scripts/python backend/tools/gsi_simulator.py --token TOKEN --scenario full_match --hz 10 --loop
```

后端必须单进程运行。`GSI_RECORD=true` 录制含 token，不应公开分享。模拟器坐标仅用于功能检查；离线控制台示例不会发送给真实 HUD。

## 验证边界

测试记录见 [桌面版更新说明](docs/桌面版更新说明.md)。仍需 CS2 真机验证坐标、楼层、cfg 命令和击杀信息保留、透明叠加、快捷键、穿透、多显示器及 DPI。

HUD 命令参考 [CS2 ConVar 实际转储](https://cs2.poggu.me/dumped-data/convar-list/)，地图资源说明见 [NOTICE](frontend/public/maps/NOTICE.md)。原始 PRD 保留历史设计，本次新增需求以 README 和更新说明为准。
