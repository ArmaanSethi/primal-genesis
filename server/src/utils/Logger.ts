// Server Logging Utility with Environment Control
// Allows complete log suppression for performance testing

export enum LogLevel {
  NONE = 0,     // No logs at all
  ERROR = 1,    // Only errors
  WARN = 2,     // Errors + warnings
  INFO = 3,      // Errors + warnings + info
  DEBUG = 4      // All logs including debug
}

class Logger {
  private static logLevel: LogLevel = Logger.getLogLevelFromEnv();

  private static getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'NONE': return LogLevel.NONE;
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.DEBUG; // Default to debug for development
    }
  }

  static shouldLog(level: LogLevel): boolean {
    return Logger.logLevel >= level;
  }

  static error(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.ERROR)) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.WARN)) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.DEBUG)) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  static gameplay(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`🎮 ${message}`, ...args);
    }
  }

  static performance(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`⚡ ${message}`, ...args);
    }
  }

  static combat(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`⚔️ ${message}`, ...args);
    }
  }

  static enemy(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.DEBUG)) {
      console.log(`👾 ${message}`, ...args);
    }
  }

  static beacon(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`🌟 ${message}`, ...args);
    }
  }

  static item(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`📦 ${message}`, ...args);
    }
  }

  static xp(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.INFO)) {
      console.log(`💎 ${message}`, ...args);
    }
  }

  static interact(message: string, ...args: any[]): void {
    if (Logger.shouldLog(LogLevel.DEBUG)) {
      console.log(`🎯 ${message}`, ...args);
    }
  }
}

export default Logger;