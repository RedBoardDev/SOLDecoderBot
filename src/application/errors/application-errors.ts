export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class MonitoringError extends ApplicationError {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(`Monitoring error: ${message}`);
    this.name = 'MonitoringError';
  }
}

export class PriceServiceError extends ApplicationError {
  constructor(message: string) {
    super(`Price service error: ${message}`);
    this.name = 'PriceServiceError';
  }
}

export class NotificationError extends ApplicationError {
  constructor(message: string) {
    super(`Notification error: ${message}`);
    this.name = 'NotificationError';
  }
}
