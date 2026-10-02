import { useState } from 'react';
import type { Weapon } from '../../lib/types';
import { weaponIcon } from '../../lib/weaponIcon';

export function WeaponDisplay({ weapon }: { weapon: Weapon | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!weapon) return <span className="weapon-display">—</span>;
  const src = weaponIcon(weapon.name);
  return <span className="weapon-display" title={weapon.display_name}>
    {src && failed !== src && <img className="weapon-icon" src={src} alt="" draggable={false} onError={() => setFailed(src)}/>}
    <span className="weapon-name">{weapon.display_name}</span>
  </span>;
}
