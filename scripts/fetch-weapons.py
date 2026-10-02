"""Refresh local CS2 equipment silhouettes; no network is needed at runtime."""
import ast
import concurrent.futures
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'frontend/public/weapons'
REPO = 'Juknum/counter-strike-icons'
PREFIX = 'cs2/panorama/images/icons/equipment/'


def read(url):
    return urllib.request.urlopen(url, timeout=40).read()


if __name__ == '__main__':
    tree = json.loads(read(f'https://api.github.com/repos/{REPO}/git/trees/main?recursive=1'))
    revision = tree['sha']
    base = f'https://raw.githubusercontent.com/{REPO}/{revision}/'
    names = set(ast.literal_eval(ast.parse((ROOT / 'backend/app/core/weapons.py').read_text()).body[0].value))
    paths = [entry['path'] for entry in tree['tree'] if entry['path'].startswith(PREFIX)
             and entry['path'].endswith('.svg')
             and (Path(entry['path']).stem in names or Path(entry['path']).stem.startswith('knife'))]
    DEST.mkdir(parents=True, exist_ok=True)

    def download(path):
        data = read(base + path)
        root = ET.fromstring(data)
        assert root.tag.endswith('svg'), path
        assert not any(e.tag.endswith('script') for e in root.iter()), path
        (DEST / Path(path).name).write_bytes(data)
        return Path(path).stem

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        icons = sorted(pool.map(download, paths))
    missing = names - set(icons)
    assert not missing, f'Missing equipment: {missing}'
    (DEST / 'manifest.json').write_text(json.dumps(icons, indent=2) + '\n', encoding='utf-8')
    (DEST / 'SOURCE.txt').write_text(f'https://github.com/{REPO}\nRevision: {revision}\nPath: {PREFIX}\n', encoding='utf-8')
    (DEST / 'LICENSE.txt').write_bytes(read(base + 'LICENSE'))
    print(f'Downloaded {len(icons)} equipment icons')
