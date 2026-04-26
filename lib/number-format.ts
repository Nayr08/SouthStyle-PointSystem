const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const preciseNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCompactStatValue(value: number) {
  if (!Number.isFinite(value)) return '0';

  if (Math.abs(value) < 1000) {
    return preciseNumberFormatter.format(value);
  }

  return compactNumberFormatter.format(value);
}
