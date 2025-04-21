import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

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
  logToFile?: boolean;
  logDir?: string;
};

class Logger {
  private level: LogLevel;
  private timestamps: boolean;
  private colorize: boolean;
  private logToFile: boolean;
  private logDir: string;
  private currentLogFile: string | null = null;
  private currentDate = '';

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.timestamps = options.timestamps ?? true;
    this.colorize = options.colorize ?? true;
    this.logToFile = options.logToFile ?? true;
    this.logDir = options.logDir ?? path.join(process.cwd(), 'logs');

    if (this.logToFile) {
      this.initializeLogDir();
      this.updateLogFile();
    }
  }

  private initializeLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        console.info(`Created log directory: ${this.logDir}`);
      }
    } catch (error) {
      console.error(`Failed to create log directory: ${error instanceof Error ? error.message : String(error)}`);
      this.logToFile = false;
    }
  }

  private updateLogFile(): void {
    const currentDate = new Date().toISOString().split('T')[0];

    if (this.currentDate !== currentDate) {
      this.currentDate = currentDate;
      this.currentLogFile = path.join(this.logDir, `${currentDate}.log`);
    }
  }

  private formatTimestamp(): string {
    return this.timestamps ? `[${new Date().toISOString()}]` : '';
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, unknown>): string {
    const timestamp = this.formatTimestamp();
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} ${level} ${message}${metadataStr}`;
  }

  private writeToFile(formattedMessage: string): void {
    if (!this.logToFile || !this.currentLogFile) return;

    this.updateLogFile();

    try {
      fs.appendFileSync(this.currentLogFile, `${formattedMessage}\n`);
    } catch (error) {
      console.error(`Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      this.writeToFile(formattedMsg);
    }
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      const formattedMsg = this.formatMessage('WARN', message, metadata);
      console.warn(this.colorize ? chalk.yellow(formattedMsg) : formattedMsg);
      this.writeToFile(formattedMsg);
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const combinedMetadata = error
        ? { ...metadata, error: { message: error.message, stack: error.stack } }
        : metadata;

      const formattedMsg = this.formatMessage('ERROR', message, combinedMetadata);
      console.error(this.colorize ? chalk.red(formattedMsg) : formattedMsg);
      this.writeToFile(formattedMsg);
    }
  }

  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (this.level <= LogLevel.FATAL) {
      const combinedMetadata = error
        ? { ...metadata, error: { message: error.message, stack: error.stack } }
        : metadata;

      const formattedMsg = this.formatMessage('FATAL', message, combinedMetadata);
      console.error(this.colorize ? chalk.bgRed.white(formattedMsg) : formattedMsg);
      this.writeToFile(formattedMsg);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  enableFileLogging(enable = true): void {
    this.logToFile = enable;
    if (enable && !this.currentLogFile) {
      this.initializeLogDir();
      this.updateLogFile();
    }
  }

  setLogDirectory(directory: string): void {
    this.logDir = directory;
    this.initializeLogDir();
    this.updateLogFile();
  }
}

export const logger = new Logger();

export { LogLevel };
