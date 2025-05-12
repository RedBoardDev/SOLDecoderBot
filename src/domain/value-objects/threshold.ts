import { InvalidThresholdError } from '../errors/domain-errors';

export class Threshold {
  private constructor(private readonly percent: number) {}

  static create(percent: number): Threshold {
    if (percent < 0 || percent > 100 || !Number.isFinite(percent)) {
      throw new InvalidThresholdError(percent);
    }
    return new Threshold(percent);
  }

  get value(): number {
    return this.percent;
  }
}
