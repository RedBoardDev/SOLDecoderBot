import chalk from 'chalk';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

type LoggerOptions = {
  level?: LogLevel;
  timestamps?: boolean;
  colorize?: boolean;
};

class Logger {
  private level: LogLevel;
  private timestamps: boolean;
  private colorize: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.timestamps = options.timestamps ?? true;
    this.colorize = options.colorize ?? true;
  }

  private formatTimestamp(): string {
    return this.timestamps ? `[${new Date().toISOString()}]` : '';
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, unknown>): string {
    const timestamp = this.formatTimestamp();
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} ${level} ${message}${metadataStr}`;
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      const formattedMsg = this.formatMessage('DEBUG', message, metadata);
      console.debug(this.colorize ? chalk.gray(formattedMsg) : formattedMsg);
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      const formattedMsg = this.formatMessage('INFO', message, metadata);
      console.info(this.colorize ? chalk.blue(formattedMsg) : formattedMsg);
    }
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      const formattedMsg = this.formatMessage('WARN', message, metadata);
      console.warn(this.colorize ? chalk.yellow(formattedMsg) : formattedMsg);
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const combinedMetadata = error
        ? { ...metadata, error: { message: error.message, stack: error.stack } }
        : metadata;

      const formattedMsg = this.formatMessage('ERROR', message, combinedMetadata);
      console.error(this.colorize ? chalk.red(formattedMsg) : formattedMsg);
    }
  }

  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.FATAL) {
      const combinedMetadata = error
        ? { ...metadata, error: { message: error.message, stack: error.stack } }
        : metadata;

      const formattedMsg = this.formatMessage('FATAL', message, combinedMetadata);
      console.error(this.colorize ? chalk.bgRed.white(formattedMsg) : formattedMsg);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Export singleton instance with default options
export const logger = new Logger();

// Export LogLevel enum for configuration
export { LogLevel };
