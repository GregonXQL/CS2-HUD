from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


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
