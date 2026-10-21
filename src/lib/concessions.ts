/** Venue F&B catalog — fixed paise prices (BookMyShow / TicketNew style add-ons). */
export type ConcessionItem = {
  id: string;
  nameEn: string;
  nameMr: string;
  descEn: string;
  descMr: string;
  /** Price in paise */
  pricePaise: number;
  emoji: string;
  /** Suggest when party size >= this */
  suggestFrom?: number;
};

export const CONCESSION_MENU: ConcessionItem[] = [
  {
    id: 'samosa',
    nameEn: 'Samosa (2 pcs)',
    nameMr: 'समोसा (२ नग)',
    descEn: 'Crispy potato samosa',
    descMr: 'खमंग बटाटा समोसा',
    pricePaise: 6000,
    emoji: '🥟',
    suggestFrom: 2,
  },
  {
    id: 'popcorn',
    nameEn: 'Butter Popcorn',
    nameMr: 'बटर पॉपकॉर्न',
    descEn: 'Medium bucket',
    descMr: 'मध्यम बकेट',
    pricePaise: 12000,
    emoji: '🍿',
    suggestFrom: 1,
  },
  {
    id: 'vada',
    nameEn: 'Batata Vada',
    nameMr: 'बटाटा वडा',
    descEn: 'With chutney',
    descMr: 'चटणीसह',
    pricePaise: 4000,
    emoji: '🥙',
    suggestFrom: 2,
  },
  {
    id: 'chai',
    nameEn: 'Cutting Chai',
    nameMr: 'कटिंग चहा',
    descEn: 'Hot masala chai',
    descMr: 'गरम मसाला चहा',
    pricePaise: 2000,
    emoji: '☕',
    suggestFrom: 1,
  },
  {
    id: 'combo',
    nameEn: 'Couple Combo',
    nameMr: 'कपल कॉम्बो',
    descEn: '2 chai + 2 samosa',
    descMr: '२ चहा + २ समोसा',
    pricePaise: 15000,
    emoji: '🎁',
    suggestFrom: 2,
  },
];

export type AddonSelection = { id: string; qty: number };

export function addonTotalPaise(selected: AddonSelection[]): number {
  return selected.reduce((sum, s) => {
    const item = CONCESSION_MENU.find((c) => c.id === s.id);
    return sum + (item ? item.pricePaise * s.qty : 0);
  }, 0);
}
