export function formatIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
