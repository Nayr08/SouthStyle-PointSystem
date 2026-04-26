export const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Titanium'] as const;

export type TierName = (typeof tierNames)[number];

export const tierLabel: Record<TierName, string> = {
  Bronze: 'Bronze',
  Silver: 'Silver',
  Gold: 'Gold',
  Platinum: 'Platinum',
  Diamond: 'Diamond',
  Titanium: 'Titanium',
};

export const tierMinimum: Record<TierName, number> = {
  Bronze: 100,
  Silver: 300,
  Gold: 500,
  Platinum: 1000,
  Diamond: 3000,
  Titanium: 5000,
};
