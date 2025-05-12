export type Frequency = 'DAY' | 'WEEK' | 'MONTH';

const ALL_FREQUENCIES: Frequency[] = ['DAY', 'WEEK', 'MONTH'];

export class FrequencyVO {
  private constructor(private readonly value: Frequency) {}

  static create(value: string): FrequencyVO {
    if (!ALL_FREQUENCIES.includes(value as Frequency)) {
      throw new Error(`Invalid frequency: ${value}`);
    }
    return new FrequencyVO(value as Frequency);
  }

  get raw(): Frequency {
    return this.value;
  }

  static all(): Frequency[] {
    return [...ALL_FREQUENCIES];
  }
}
