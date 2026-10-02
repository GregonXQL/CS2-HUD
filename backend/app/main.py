import asyncio
import hmac
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException

from app.config import Settings
from app.core.broadcaster import Broadcaster
from app.core.default_layout import default_layout
from app.core.layout_store import atomic_write, load_json
from app.core.normalizer import normalize, obj
from app.core.team_manager import TeamManager
from app.models.layout import HudLayout, ModulePatch, Visibility
from app.models.match import MatchState
from app.models.teams import TeamSettings, TeamPatch


def create_app(settings: Settings | None = None):
    config = settings or Settings()
    bus = Broadcaster()
    layout = load_json(config.data_dir / 'layout.json', HudLayout, default_layout)
    teams = TeamManager(load_json(config.data_dir / 'teams.json', TeamSettings, TeamSettings))
    state = MatchState()
    raw = None
    last_gsi = None
    dirty = False
    recording = config.data_dir / 'recordings' / f'{time.time_ns()}.jsonl'
    mutation_lock = asyncio.Lock()

    def status():
        return {'online': state.gsi_online, 'last_update_ms': state.last_update_ms}

    def team_payload():
        return {**teams.settings.model_dump(), 'roster_counts': teams.counts()}

    def publish_teams():
        bus.broadcast('teams', team_payload())

    def refresh_state():
        nonlocal state, dirty
        if raw is not None:
            state = normalize(raw, teams.settings, state.last_update_ms, state.gsi_online)
            dirty = True

    async def ticker():
        nonlocal dirty, state
        while True:
            await asyncio.sleep(1 / config.state_max_hz)
            if last_gsi is not None and state.gsi_online and time.monotonic() - last_gsi > config.gsi_offline_seconds:
                state = state.model_copy(update={'gsi_online': False})
                bus.broadcast('gsi_status', status())
            if dirty:
                dirty = False
                bus.broadcast('state', state.model_dump())

    @asynccontextmanager
    async def lifespan(app):
        if config.gsi_token == 'CHANGE_ME_TOKEN':
            logging.warning('GSI_TOKEN 使用默认值，请同时修改 backend/.env 与 GSI cfg')
        task = asyncio.create_task(ticker())
        yield
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await bus.close()

    app = FastAPI(title='CS2 Broadcast', lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
                       allow_methods=['*'], allow_headers=['*'])

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(status_code=422, content={'error': {'code': 'VALIDATION_ERROR', 'message': str(exc)}})

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        code = 'UNAUTHORIZED' if exc.status_code == 401 else ('MODULE_NOT_FOUND' if str(exc.detail) == '模块不存在' else 'HTTP_ERROR')
        return JSONResponse(status_code=exc.status_code, content={'error': {'code': code, 'message': str(exc.detail)}})

    @app.exception_handler(OSError)
    async def storage_error(request, exc):
        logging.exception('持久化失败')
        return JSONResponse(status_code=503, content={'error': {'code': 'STORAGE_ERROR', 'message': '保存失败，请检查数据目录权限和磁盘空间'}})

    @app.post('/api/gsi')
    async def gsi(request: Request):
        nonlocal state, raw, last_gsi, dirty
        try:
            payload = await request.json()
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(401, 'GSI token 无效')
        token = obj(obj(payload).get('auth')).get('token')
        if not isinstance(token, str) or not hmac.compare_digest(token.encode(), config.gsi_token.encode()):
            raise HTTPException(401, 'GSI token 无效')
        async with mutation_lock:
            raw = payload
            last_gsi = time.monotonic()
            now = int(time.time() * 1000)
            was_online = state.gsi_online
            try:
                before = team_payload()
                teams.update(payload)
                if before != team_payload():
                    if before['a_side'] != teams.settings.a_side:
                        await asyncio.to_thread(atomic_write, config.data_dir / 'teams.json', teams.settings)
                    publish_teams()
                updated = normalize(payload, teams.settings, now)
                dirty = dirty or state.model_dump(exclude={'last_update_ms'}) != updated.model_dump(exclude={'last_update_ms'})
                state = updated
                if config.gsi_record:
                    def record():
                        recording.parent.mkdir(parents=True, exist_ok=True)
                        with recording.open('a', encoding='utf-8') as file:
                            file.write(json.dumps(payload, ensure_ascii=False) + '\n')
                    await asyncio.to_thread(record)
            except Exception:
                logging.exception('GSI 数据处理失败，已接受请求')
                state = state.model_copy(update={'gsi_online': True, 'last_update_ms': now})
            if not was_online:
                bus.broadcast('gsi_status', status())
        return Response(status_code=200)

    @app.get('/api/health')
    async def health():
        return {'status': 'ok', 'desktop_parent_pid': os.environ.get('DESKTOP_PARENT_PID'), 'gsi_online': state.gsi_online, 'last_update_ms': state.last_update_ms, 'ws_clients': bus.counts()}

    @app.get('/api/state')
    async def get_state():
        return state

    @app.get('/api/debug/raw')
    async def get_raw():
        # Never expose the configured GSI secret to browser clients.
        return {k: v for k, v in raw.items() if k != 'auth'} if raw else None

    @app.get('/api/layout')
    async def get_layout():
        return layout

    async def save_layout(value):
        nonlocal layout
        value = value.model_copy(update={'updated_at_ms': int(time.time() * 1000)})
        await asyncio.to_thread(atomic_write, config.data_dir / 'layout.json', value)
        layout = value
        bus.broadcast('layout', layout.model_dump())
        return layout

    @app.put('/api/layout')
    async def put_layout(value: HudLayout):
        async with mutation_lock:
            return await save_layout(value)

    @app.patch('/api/layout/modules/{module_id}')
    async def patch_module(module_id: str, patch: ModulePatch):
        async with mutation_lock:
            if module_id not in layout.modules:
                raise HTTPException(404, '模块不存在')
            modules = dict(layout.modules)
            modules[module_id] = modules[module_id].model_copy(update=patch.model_dump(exclude_unset=True))
            return await save_layout(layout.model_copy(update={'modules': modules}))

    @app.post('/api/layout/visibility')
    async def visibility(value: Visibility):
        async with mutation_lock:
            return await save_layout(layout.model_copy(update={'hud_visible': value.hud_visible}))

    @app.post('/api/layout/reset')
    async def reset_layout():
        async with mutation_lock:
            return await save_layout(default_layout())

    @app.get('/api/teams')
    async def get_teams():
        return team_payload()

    async def save_teams(value):
        await asyncio.to_thread(atomic_write, config.data_dir / 'teams.json', value)
        teams.settings = value
        publish_teams()
        refresh_state()
        return team_payload()

    @app.put('/api/teams')
    async def put_teams(patch: TeamPatch):
        async with mutation_lock:
            return await save_teams(teams.settings.model_copy(update=patch.model_dump(exclude_unset=True)))

    @app.post('/api/teams/swap')
    async def swap_teams():
        async with mutation_lock:
            return await save_teams(teams.settings.model_copy(update={'a_side': 'T' if teams.settings.a_side == 'CT' else 'CT'}))

    @app.post('/api/teams/reset-roster')
    async def reset_roster():
        async with mutation_lock:
            teams.reset()
            publish_teams()
            return team_payload()

    @app.websocket('/ws')
    async def websocket(socket: WebSocket):
        await socket.accept()
        role = 'control' if socket.query_params.get('role') == 'control' else 'hud'
        client = bus.add(socket, role, {'state': state.model_dump(), 'layout': layout.model_dump(), 'teams': team_payload(), 'clients': bus.counts()})
        try:
            while True:
                message = await socket.receive_json()
                if obj(message).get('type') == 'ping':
                    bus.send(client, 'pong', {})
        except (WebSocketDisconnect, ValueError, RuntimeError):
            pass
        finally:
            bus.remove(client)
            bus.broadcast('clients', bus.counts())

    @app.get('/{path:path}')
    async def frontend(path: str):
        if path == 'ws' or path == 'api' or path.startswith('api/'):
            raise HTTPException(404, '接口不存在')
        root = config.frontend_dist.resolve()
        candidate = (root / path).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            return FileResponse(candidate)
        if (root / 'index.html').is_file():
            return FileResponse(root / 'index.html')
        raise HTTPException(404, '前端未构建，请在 frontend 目录执行 npm run build')

    return app


app = create_app()

if __name__ == '__main__':
    import uvicorn
    settings = Settings()
    uvicorn.run('app.main:app', host=settings.host, port=settings.port)
