/**
 * Logger service that controls logging based on environment
 * Ensures logs only appear in development and errors are properly handled in all environments
 */
class Logger {
  private static instance: Logger;
  private isDevMode: boolean;
  private enableDebugLogs: boolean;

  constructor() {
    // Check if we're in development mode
    this.isDevMode = import.meta.env.DEV === true;
    // Allow debug logs in production with special flag
    this.enableDebugLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';
  }

  /**
   * Get the singleton instance of the logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Standard log - only in development
   */
  log(...args: any[]): void {
    if (this.isDevMode) {
      console.log(...args);
    }
  }

  /**
   * Warning log - only in development
   */
  warn(...args: any[]): void {
    if (this.isDevMode) {
      console.warn(...args);
    }
  }

  /**
   * Info log - only in development
   */
  info(...args: any[]): void {
    if (this.isDevMode) {
      console.info(...args);
    }
  }

  /**
   * Error log - available in all environments
   * Errors are important and should be logged everywhere
   */
  error(...args: any[]): void {
    // Error logs are preserved in all environments
    console.error(...args);
  }

  /**
   * Debug log - only shown when enabled via env variable
   * More detailed than standard logs, controlled by VITE_ENABLE_DEBUG_LOGS
   */
  debug(...args: any[]): void {
    if (this.isDevMode || this.enableDebugLogs) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Group logs (only in development)
   */
  group(label: string): void {
    if (this.isDevMode) {
      console.group(label);
    }
  }

  /**
   * End a log group (only in development)
   */
  groupEnd(): void {
    if (this.isDevMode) {
      console.groupEnd();
    }
  }

  /**
   * Time measurement start (only in development)
   */
  time(label: string): void {
    if (this.isDevMode) {
      console.time(label);
    }
  }

  /**
   * Time measurement end (only in development)
   */
  timeEnd(label: string): void {
    if (this.isDevMode) {
      console.timeEnd(label);
    }
  }

  /**
   * Create a prefixed logger for a specific component/service
   * @param prefix The prefix to add to all logs from this logger
   */
  createPrefixedLogger(prefix: string): PrefixedLogger {
    return new PrefixedLogger(this, prefix);
  }
}

/**
 * A logger that prefixes all logs with a specific prefix
 * Useful for services and components to identify their logs
 */
class PrefixedLogger {
  constructor(private logger: Logger, private prefix: string) {}

  log(...args: any[]): void {
    this.logger.log(`[${this.prefix}]`, ...args);
  }

  warn(...args: any[]): void {
    this.logger.warn(`[${this.prefix}]`, ...args);
  }

  info(...args: any[]): void {
    this.logger.info(`[${this.prefix}]`, ...args);
  }

  error(...args: any[]): void {
    this.logger.error(`[${this.prefix}]`, ...args);
  }

  debug(...args: any[]): void {
    this.logger.debug(`[${this.prefix}]`, ...args);
  }
  
  group(label: string): void {
    this.logger.group(`[${this.prefix}] ${label}`);
  }
  
  groupEnd(): void {
    this.logger.groupEnd();
  }
  
  time(label: string): void {
    this.logger.time(`[${this.prefix}] ${label}`);
  }
  
  timeEnd(label: string): void {
    this.logger.timeEnd(`[${this.prefix}] ${label}`);
  }
}

// Export a singleton instance
export const logger = Logger.getInstance(); 