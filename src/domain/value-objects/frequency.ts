import { InvalidFrequencyError } from '../errors/domain-errors';

export type FrequencyType = 'DAY' | 'WEEK' | 'MONTH';

export class Frequency {
  private constructor(private readonly freq: FrequencyType) {}

  static readonly DAY = new Frequency('DAY');
  static readonly WEEK = new Frequency('WEEK');
  static readonly MONTH = new Frequency('MONTH');

  static create(input: string): Frequency {
    const up = input.trim().toUpperCase();
    switch (up) {
      case 'DAY':
        return Frequency.DAY;
      case 'WEEK':
        return Frequency.WEEK;
      case 'MONTH':
        return Frequency.MONTH;
      default:
        throw new InvalidFrequencyError(input);
    }
  }

  toString(): FrequencyType {
    return this.freq;
  }
}
