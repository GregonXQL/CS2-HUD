# MVP 实现与验证记录

日期：2026-09-30。环境：macOS arm64、Python 3.14、Node.js 26。Windows 为覆盖窗口的目标运行平台。

## 已实现

- F1：GSI token 校验、宽松字段解析、标准化、原始帧调试（移除 auth）、可选 JSONL 录制。
- F2–F4：比分/回合/倒计时/炸弹、10 人选手卡、当前观察玩家；非观战时保留当前玩家。
- F5–F8：全局与模块显隐、拖拽/缩放/吸附/键盘微调、属性编辑、原子 JSON 持久化、默认布局恢复。
- F9–F10：A/B 队名覆盖、阵营多数判断、手动交换、名单重学、连接数与离线状态。
- F11：Electron 透明窗口、鼠标穿透、显示器选择、中文托盘、全局快捷键、加载重试、单实例、置顶保持、Windows 便携打包。
- 11 个 GSI 模拟场景及 full_match 串联；README、跨平台启动/构建脚本。

## 已执行的验证

| 检查 | 结果 |
| --- | --- |
| `cd backend && .venv/bin/pytest -q` | 27 项通过；第三方 Starlette/httpx 有 1 条弃用提示 |
| `cd frontend && npm test` | 3 项通过 |
| `cd frontend && npm run build` | TypeScript 与 Vite 生产构建通过 |
| `cd overlay && npm run build` | TypeScript 编译通过 |
| `cd overlay && npm run dist` | Windows x64 便携包生成成功，约 83 MB |
| 真实 HTTP/WebSocket smoke test | 双客户端显隐同步约 9.2 ms；静态页面、10 人、死亡、换边、非观战场景通过 |
| full_match 模拟器 | 11 场景共 176 帧全部返回 200 |
| macOS Electron 开发启动 | 成功启动、加载 HUD 静态资源并建立 HUD WebSocket 连接 |

9.2 ms 是本机 REST 修改到两个 WebSocket 客户端收到消息的测量值，不代表游戏屏幕完成渲染的端到端延迟。HUD 淡出动画按 PRD 为 300 ms。

## 尚未完成的人工验收

当前浏览器自动化无可用连接，原生浏览器自动化超时。页面已构建并由 Electron 加载，但没有完成界面截图审查或拖拽手工验收。

Windows CS2 真机待验收：

- 全屏窗口化游戏中的透明效果、鼠标穿透与不抢焦点。
- 游戏前台快捷键、Alt+Tab 后持续置顶。
- 多显示器热插拔/切换以及 1080p、1440p 布局一致性。
- 游戏数据正确性与控制台操作到画面变化的端到端延迟。

P1 的命名预设、队标、回合历史展示不在本次范围。尚不能把 PRD 的全部真机验收项标为已完成。
