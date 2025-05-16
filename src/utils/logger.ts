/**
 * Logger utility for consistent logging across the application
 */
import { LOGGING } from '../config/constants';

/**
 * Log levels
 */
type LogLevel = 'info' | 'error' | 'debug' | 'warn';

/**
 * Logger class for consistent logging
 */
class Logger {
  /**
   * Log an informational message
   * @param prefix Category prefix for the log
   * @param message Message to log
   * @param data Optional data to include
   */
  info(prefix: string, message: string, data?: any): void {
    this.log('info', prefix, message, data);
  }

  /**
   * Log an error message
   * @param prefix Category prefix for the log
   * @param message Error message
   * @param error Error object or additional details
   */
  error(prefix: string, message: string, error?: any): void {
    this.log('error', prefix, message, error);
  }

  /**
   * Log a debug message (only in development)
   * @param prefix Category prefix for the log
   * @param message Debug message
   * @param data Optional data to include
   */
  debug(prefix: string, message: string, data?: any): void {
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', prefix, message, data);
    }
  }

  /**
   * Log a warning message
   * @param prefix Category prefix for the log
   * @param message Warning message
   * @param data Optional data to include
   */
  warn(prefix: string, message: string, data?: any): void {
    this.log('warn', prefix, message, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, prefix: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    
    // Format the log message
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    
    // Log with appropriate level
    switch (level) {
      case 'error':
        console.error(logMessage);
        if (data) console.error(data);
        break;
      case 'warn':
        console.warn(logMessage);
        if (data) console.warn(data);
        break;
      case 'debug':
        console.debug(logMessage);
        if (data) console.debug(data);
        break;
      case 'info':
      default:
        console.log(logMessage);
        if (data) console.log(data);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export prefixes for convenience
export const { PREFIXES } = LOGGING;
