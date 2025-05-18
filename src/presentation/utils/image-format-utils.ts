export interface ValueFormat {
  /** "+" | "-" | "" */
  sign: string;
  /** hex color code */
  color: string;
}

export function formatValue(value: number): ValueFormat {
  if (value > 0) return { sign: '+', color: '#66ff66' };
  if (value < 0) return { sign: '-', color: '#ff6666' };
  return { sign: '', color: '#ffd700' };
}
