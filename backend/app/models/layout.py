from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

ModuleId = Literal['scoreboard', 'team_left', 'team_right', 'observed_player']
MODULE_IDS = {'scoreboard', 'team_left', 'team_right', 'observed_player'}


class ModulePatch(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    visible: bool | None = None
    x: float | None = Field(None, ge=-500, le=2420)
    y: float | None = Field(None, ge=-500, le=1580)
    scale: float | None = Field(None, ge=0.25, le=3)
    z: int | None = Field(None, ge=-1000, le=1000)

    @model_validator(mode='after')
    def no_explicit_null(self):
        if any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError('模块属性不能为 null')
        return self


class ModuleLayout(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    id: ModuleId
    visible: bool = True
    x: float = Field(ge=-500, le=2420)
    y: float = Field(ge=-500, le=1580)
    scale: float = Field(1, ge=0.25, le=3)
    z: int = Field(0, ge=-1000, le=1000)


class HudLayout(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: Literal[1] = 1
    hud_visible: bool = True
    modules: dict[str, ModuleLayout]
    updated_at_ms: int = 0

    @model_validator(mode='after')
    def valid_modules(self):
        if set(self.modules) != MODULE_IDS or any(k != v.id for k, v in self.modules.items()):
            raise ValueError('布局必须包含全部四个 P0 模块，且 ID 与键一致')
        return self


class Visibility(BaseModel):
    hud_visible: bool
