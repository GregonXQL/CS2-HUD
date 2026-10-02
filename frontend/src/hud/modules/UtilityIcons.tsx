const items: Record<string, { label: string; color: string; path: string }> = {
  HE: { label: '高爆手雷', color: '#eb9274', path: 'M8 7h8l2 5v7l-4 3h-4l-4-3v-7Zm2-4h7v3h-7Zm7 1 4 5M8 12h10M8 16h10M12 8v13' },
  Flash: { label: '闪光弹', color: '#fff0a5', path: 'M9 7h6v14H9ZM10 3h5v4M5 5 2 2M19 5l3-3M5 10H1M19 10h4M10 11h4M10 17h4' },
  Smoke: { label: '烟雾弹', color: '#a3d6b3', path: 'M8 8h8v13H8ZM10 5h4v3M9 12h6M9 17h6M9 4C5 0 15 1 12-3' },
  Molotov: { label: '燃烧瓶', color: '#ffa458', path: 'M10 8V3h4v5l3 4v9H7v-9ZM10 14h4M14 3l4-2 2 3' },
  Incendiary: { label: '燃烧弹', color: '#ff775e', path: 'M8 8h8v13H8ZM10 4h4v4M12 11c-6 6 5 9 2 2l-2 3Z' },
  Decoy: { label: '诱饵弹', color: '#b8abd9', path: 'M9 7h6v14H9ZM10 3h5v4M5 10c-3 3-3 5 0 8M19 10c3 3 3 5 0 8' },
  C4: { label: 'C4 炸弹', color: '#ffce73', path: 'M4 7h16v14H4ZM7 11h6v4H7ZM16 11v7M7 18h6M8 7V3h8v4' },
};
export function UtilityIcons({ grenades, bomb = false }: { grenades: string[]; bomb?: boolean }) {
  const names = [...grenades, ...(bomb ? ['C4'] : [])];
  return <span className="utility-icons">{names.map((name, i) => { const item = items[name]; return <svg key={`${name}-${i}`} viewBox="0 0 24 24" role="img" aria-label={item?.label ?? name} style={{ color: item?.color ?? '#ccc' }}><title>{item?.label ?? name}</title><path d={item?.path ?? 'M6 6h12v15H6ZM9 3h6v3'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; })}</span>;
}
