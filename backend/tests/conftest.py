import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import Settings
from tools.gsi_simulator import payload


@pytest.fixture
def sample():
    return payload()


@pytest.fixture
def config(tmp_path):
    return Settings(_env_file=None, data_dir=tmp_path, gsi_token='test-token', gsi_offline_seconds=.2)


@pytest.fixture
def client(config):
    with TestClient(create_app(config)) as value:
        yield value
