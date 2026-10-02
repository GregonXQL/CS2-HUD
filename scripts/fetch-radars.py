"""Fetch paired Valve overview images/coordinates; run only when updating assets."""
import concurrent.futures
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'frontend/public/maps'
BASE = 'https://raw.githubusercontent.com/2mlml/cs2-radar-images/master/'
MAPS = ['de_mirage', 'de_inferno', 'de_dust2', 'de_ancient', 'de_anubis',
        'de_nuke', 'de_overpass', 'de_train', 'de_vertigo', 'de_cache']
OVERRIDES = {
    'de_cache.txt': 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/data/radar_info/de_cache.txt',
    'de_cache.png': 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_cache_radar_tga.png',
}


def download(name):
    def fetch(file):
        data = urllib.request.urlopen(OVERRIDES.get(file, BASE + file), timeout=60).read()
        (ROOT / file).write_bytes(data)
        return data
    raw = fetch(name + '.txt').decode('utf-8-sig')
    fetch(name + '.png')
    fields = dict(re.findall(r'"([^"\n]+)"\s+"([^"\n]+)"', raw))
    result = {k: float(fields[k]) for k in ('pos_x', 'pos_y', 'scale')}
    result['image'] = '/maps/' + name + '.png'
    # Valve verticalsections contain height ranges. Keep both floors available.
    sections = re.findall(r'"(lower\w*)"\s*\{([^}]+)\}', re.sub(r'//[^\n]*', '', raw))
    if sections:
        floor, body = sections[0]
        bounds = dict(re.findall(r'"([^"\n]+)"\s+"([^"\n]+)"', body))
        fetch(name + '_' + floor + '.png')
        result['lowerImage'] = '/maps/' + name + '_' + floor + '.png'
        result['lowerMax'] = float(bounds['AltitudeMax'])
    return name, result


if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        manifest = dict(pool.map(download, MAPS))
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('Downloaded', len(manifest), 'radars')
