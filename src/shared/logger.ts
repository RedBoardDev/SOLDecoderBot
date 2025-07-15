import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private logsDir: string;
  private readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

  private constructor() {
    // Initialize logs directory
    this.logsDir = path.join(path.dirname(__dirname), '..', 'logs');
    this.ensureLogsDirectory();

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    this.currentLevel = this.mapLogLevel(envLevel);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private mapLogLevel(level: string): LogLevel {
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return `${date}.log`;
  }

  private getColoredLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return chalk.bold.red('ERROR');
      case LogLevel.WARN:
        return chalk.bold.yellow('WARN ');
      case LogLevel.INFO:
        return chalk.bold.blue('INFO ');
      case LogLevel.DEBUG:
        return chalk.bold.gray('DEBUG');
      default:
        return chalk.bold.white('UNKNOWN');
    }
  }

  private getColoredTimestamp(): string {
    return chalk.gray(new Date().toISOString());
  }

  private formatLogEntry(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    let logLine = `${timestamp} [${levelName}] ${message}`;

    if (data !== undefined) {
      if (data instanceof Error) {
        logLine += `\n  Error: ${data.message}`;
        if (data.stack) {
          logLine += `\n  Stack: ${data.stack}`;
        }
      } else if (typeof data === 'object') {
        try {
          logLine += `\n  Data: ${JSON.stringify(data, null, 2)}`;
        } catch {
          logLine += '\n  Data: [Object - could not serialize]';
        }
      } else {
        logLine += `\n  Data: ${String(data)}`;
      }
    }

    return logLine;
  }

  private formatConsoleLog(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.getColoredTimestamp();
    const coloredLevel = this.getColoredLevel(level);
    const coloredMessage = this.getColoredMessage(level, message);

    let logLine = `${timestamp} ${coloredLevel} ${coloredMessage}`;

    if (data !== undefined) {
      if (data instanceof Error) {
        logLine += `\n  ${chalk.red('Error:')} ${chalk.red(data.message)}`;
        if (data.stack) {
          logLine += `\n  ${chalk.gray('Stack:')} ${chalk.gray(data.stack)}`;
        }
      } else if (typeof data === 'object') {
        try {
          const jsonData = JSON.stringify(data, null, 2);
          logLine += `\n  ${chalk.cyan('Data:')} ${chalk.gray(jsonData)}`;
        } catch {
          logLine += `\n  ${chalk.cyan('Data:')} ${chalk.gray('[Object - could not serialize]')}`;
        }
      } else {
        logLine += `\n  ${chalk.cyan('Data:')} ${chalk.gray(String(data))}`;
      }
    }

    return logLine;
  }

  private getColoredMessage(level: LogLevel, message: string): string {
    switch (level) {
      case LogLevel.ERROR:
        return chalk.red(message);
      case LogLevel.WARN:
        return chalk.yellow(message);
      case LogLevel.INFO:
        return chalk.white(message);
      case LogLevel.DEBUG:
        return chalk.gray(message);
      default:
        return chalk.white(message);
    }
  }

  private writeToFile(level: LogLevel, message: string, data?: any): void {
    const logEntry = this.formatLogEntry(level, message, data);
    const fileName = this.getLogFileName();
    const filePath = path.join(this.logsDir, fileName);

    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.MAX_LOG_SIZE) {
          const rotatedFileName = `${fileName}.${Date.now()}`;
          fs.renameSync(filePath, path.join(this.logsDir, rotatedFileName));
        }
      }

      fs.appendFileSync(filePath, `${logEntry}\n`, 'utf8');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
      console.log(logEntry);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level <= this.currentLevel) {
      // Write to file (without colors for file logs)
      this.writeToFile(level, message, data);

      // Output to console with colors in development
      if (process.env.NODE_ENV !== 'production') {
        const consoleLog = this.formatConsoleLog(level, message, data);
        console.log(consoleLog);
      }
    }
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  // Utility methods for common patterns with enhanced styling
  dbError(operation: string, error: any): void {
    this.error(`Database operation failed: ${chalk.bold(operation)}`, error);
  }

  apiError(endpoint: string, error: any): void {
    this.error(`API request failed: ${chalk.bold(endpoint)}`, error);
  }

  serviceInit(serviceName: string): void {
    this.info(`Service initialized: ${chalk.green.bold(serviceName)}`);
  }

  serviceError(serviceName: string, error: any): void {
    this.error(`Service error: ${chalk.bold(serviceName)}`, error);
  }

  commandExecution(commandName: string, userId: string): void {
    this.info(`Command executed: ${chalk.cyan.bold(commandName)} by user ${chalk.magenta(userId)}`);
  }

  commandError(commandName: string, userId: string, error: any): void {
    this.error(`Command failed: ${chalk.cyan.bold(commandName)} by user ${chalk.magenta(userId)}`, error);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
