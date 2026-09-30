import time
from app.models.layout import HudLayout, ModuleLayout


def default_layout() -> HudLayout:
    positions = {'scoreboard': (660, 0), 'team_left': (0, 680),
                 'team_right': (1500, 680), 'observed_player': (680, 950)}
    return HudLayout(updated_at_ms=int(time.time() * 1000), modules={
        key: ModuleLayout(id=key, x=x, y=y, z=10 if key == 'scoreboard' else 0)
        for key, (x, y) in positions.items()
    })
