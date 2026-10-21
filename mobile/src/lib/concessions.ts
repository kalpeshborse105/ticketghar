export type ConcessionItem = {
  id: string;
  nameMr: string;
  nameEn: string;
  pricePaise: number;
  emoji: string;
  suggestFrom?: number;
};

export const CONCESSION_MENU: ConcessionItem[] = [
  { id: 'samosa', nameMr: 'समोसा (२)', nameEn: 'Samosa (2)', pricePaise: 6000, emoji: '🥟', suggestFrom: 2 },
  { id: 'popcorn', nameMr: 'पॉपकॉर्न', nameEn: 'Popcorn', pricePaise: 12000, emoji: '🍿', suggestFrom: 1 },
  { id: 'vada', nameMr: 'बटाटा वडा', nameEn: 'Batata Vada', pricePaise: 4000, emoji: '🥙', suggestFrom: 2 },
  { id: 'chai', nameMr: 'कटिंग चहा', nameEn: 'Chai', pricePaise: 2000, emoji: '☕', suggestFrom: 1 },
  { id: 'combo', nameMr: 'कपल कॉम्बो', nameEn: 'Couple Combo', pricePaise: 15000, emoji: '🎁', suggestFrom: 2 },
];

export function addonTotalPaise(selected: Record<string, number>) {
  return Object.entries(selected).reduce((sum, [id, qty]) => {
    const item = CONCESSION_MENU.find((c) => c.id === id);
    return sum + (item && qty > 0 ? item.pricePaise * qty : 0);
  }, 0);
}
