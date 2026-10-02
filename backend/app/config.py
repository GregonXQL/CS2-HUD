from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    host: str = '0.0.0.0'
    port: int = 8000
    gsi_token: str = 'CHANGE_ME_TOKEN'
    gsi_offline_seconds: float = Field(15, gt=0)
    data_dir: Path = Path('./data')
    frontend_dist: Path = Path('../frontend/dist')
    state_max_hz: float = Field(40, gt=0, le=60)
    gsi_record: bool = False
    regulation_half_rounds: int = Field(12, gt=0)
    overtime_half_rounds: int = Field(3, gt=0)
