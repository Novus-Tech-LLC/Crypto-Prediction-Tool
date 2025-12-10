import chalk from "chalk";

/**
 * Log levels for the application
 */
export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING",
}

/**
 * Logger class for structured logging with color support
 */
export class Logger {
  /**
   * Logs an info message
   */
  static info(message: string, ...args: unknown[]): void {
    console.log(chalk.blue(`[INFO] ${message}`), ...args);
  }

  /**
   * Logs a success message
   */
  static success(message: string, ...args: unknown[]): void {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  }

  /**
   * Logs an error message
   */
  static error(message: string, ...args: unknown[]): void {
    console.error(chalk.red(`[ERROR] ${message}`), ...args);
  }

  /**
   * Logs a warning message
   */
  static warn(message: string, ...args: unknown[]): void {
    console.warn(chalk.yellow(`[WARNING] ${message}`), ...args);
  }

  /**
   * Logs a message with custom formatting
   */
  static log(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  /**
   * Clears the console
   */
  static clear(): void {
    console.clear();
  }
}

