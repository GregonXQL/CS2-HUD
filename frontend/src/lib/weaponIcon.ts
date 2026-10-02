import icons from '../../public/weapons/manifest.json';
const available = new Set(icons);
export function weaponIcon(name: string): string | null {
  let key = name.replace(/^weapon_/, '');
  if (key === 'm4a1_silencer_off' || key === 'usp_silencer_off') key = key.replace(/_off$/, '');
  if (!available.has(key) && key.startsWith('knife')) key = 'knife';
  return available.has(key) ? `/weapons/${key}.svg` : null;
}
