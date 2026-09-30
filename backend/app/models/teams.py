from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class TeamSettings(BaseModel):
    model_config = ConfigDict(extra='forbid')
    a_name: str | None = Field(None, max_length=80)
    b_name: str | None = Field(None, max_length=80)
    a_short: str | None = Field(None, max_length=16)
    b_short: str | None = Field(None, max_length=16)
    a_side: Literal['CT', 'T'] = 'CT'
    left_slot: Literal['A', 'B'] = 'A'
    auto_swap: bool = True


class TeamPatch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    a_name: str | None = Field(None, max_length=80)
    b_name: str | None = Field(None, max_length=80)
    a_short: str | None = Field(None, max_length=16)
    b_short: str | None = Field(None, max_length=16)
    a_side: Literal['CT', 'T'] | None = None
    left_slot: Literal['A', 'B'] | None = None
    auto_swap: bool | None = None

    @model_validator(mode='after')
    def nonnullable_settings(self):
        for key in ('a_side', 'left_slot', 'auto_swap'):
            if key in self.model_fields_set and getattr(self, key) is None:
                raise ValueError(f'{key} 不能为 null')
        return self
