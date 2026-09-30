WEAPON_NAMES = {
    'ak47': 'AK-47', 'm4a1': 'M4A4', 'm4a1_silencer': 'M4A1-S', 'aug': 'AUG',
    'sg556': 'SG 553', 'famas': 'FAMAS', 'galilar': 'Galil AR', 'awp': 'AWP',
    'ssg08': 'SSG 08', 'scar20': 'SCAR-20', 'g3sg1': 'G3SG1', 'mac10': 'MAC-10',
    'mp9': 'MP9', 'mp7': 'MP7', 'mp5sd': 'MP5-SD', 'ump45': 'UMP-45', 'p90': 'P90',
    'bizon': 'PP-Bizon', 'nova': 'Nova', 'xm1014': 'XM1014', 'mag7': 'MAG-7',
    'sawedoff': 'Sawed-Off', 'm249': 'M249', 'negev': 'Negev', 'glock': 'Glock-18',
    'hkp2000': 'P2000', 'usp_silencer': 'USP-S', 'p250': 'P250', 'tec9': 'Tec-9',
    'fiveseven': 'Five-SeveN', 'cz75a': 'CZ75-Auto', 'elite': 'Dual Berettas',
    'deagle': 'Desert Eagle', 'revolver': 'R8 Revolver', 'hegrenade': 'HE',
    'flashbang': 'Flash', 'smokegrenade': 'Smoke', 'molotov': 'Molotov',
    'incgrenade': 'Incendiary', 'decoy': 'Decoy', 'knife': 'Knife', 'knife_t': 'Knife',
    'bayonet': 'Knife', 'c4': 'C4', 'taser': 'Zeus x27',
}


def display_name(name: str) -> str:
    key = name.removeprefix('weapon_')
    return 'Knife' if key.startswith('knife') else WEAPON_NAMES.get(key, key)
