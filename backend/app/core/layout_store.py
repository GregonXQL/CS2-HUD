import json
import logging
import os
import tempfile
from pathlib import Path
from pydantic import BaseModel, ValidationError


def atomic_write(path: Path, value: BaseModel):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as file:
            file.write(value.model_dump_json(indent=2))
            file.flush()
            os.fsync(file.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def load_json(path: Path, model, default):
    try:
        return model.model_validate_json(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return default()
    except (OSError, ValidationError, json.JSONDecodeError):
        logging.exception('无法读取 %s，使用默认设置（保留原文件）', path)
        return default()
