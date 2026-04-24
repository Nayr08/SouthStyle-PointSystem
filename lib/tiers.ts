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
