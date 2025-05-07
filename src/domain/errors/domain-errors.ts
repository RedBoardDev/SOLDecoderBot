export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidThresholdError extends DomainError {
  constructor(value: number) {
    super(`Threshold must be between 0 and 100 (inclusive); got ${value}`);
  }
}

export class InvalidFrequencyError extends DomainError {
  constructor(value: string) {
    super(`Frequency must be one of DAY, WEEK, MONTH; got "${value}"`);
  }
}

export class EntityValidationError extends DomainError {
  constructor(entity: string, reason: string) {
    super(`Invalid ${entity}: ${reason}`);
  }
}
