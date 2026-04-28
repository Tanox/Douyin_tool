import type { LoggerOptions, LogEntry } from '../types/index.js';

class Logger {
  private prefix: string;
  private enableDebug: boolean;
  private enableInfo: boolean;
  private enableWarn: boolean;
  private enableError: boolean;
  private logHistory: LogEntry[];
  private maxHistorySize: number;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '[抖音UI定制工具]';
    this.enableDebug = options.enableDebug !== false;
    this.enableInfo = options.enableInfo !== false;
    this.enableWarn = options.enableWarn !== false;
    this.enableError = options.enableError !== false;
    this.logHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  private _formatMessage(level: string, ...args: unknown[]): string {
    const timestamp = new Date().toLocaleTimeString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    return `[${timestamp}] ${this.prefix} [${level}] ${formattedArgs}`;
  }

  private _addToHistory(level: LogEntry['level'], message: string): void {
    this.logHistory.push({
      timestamp: Date.now(),
      level,
      message
    });

    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(...args: unknown[]): void {
    if (!this.enableDebug) return;
    const message = this._formatMessage('DEBUG', ...args);
    console.debug(message);
    this._addToHistory('DEBUG', message);
  }

  info(...args: unknown[]): void {
    if (!this.enableInfo) return;
    const message = this._formatMessage('INFO', ...args);
    console.info(message);
    this._addToHistory('INFO', message);
  }

  warn(...args: unknown[]): void {
    if (!this.enableWarn) return;
    const message = this._formatMessage('WARN', ...args);
    console.warn(message);
    this._addToHistory('WARN', message);
  }

  error(...args: unknown[]): void {
    if (!this.enableError) return;
    const message = this._formatMessage('ERROR', ...args);
    console.error(message);
    this._addToHistory('ERROR', message);
  }

  setLevel(options: Partial<Pick<LoggerOptions, 'enableDebug' | 'enableInfo' | 'enableWarn' | 'enableError'>>): void {
    this.enableDebug = options.enableDebug !== false;
    this.enableInfo = options.enableInfo !== false;
    this.enableWarn = options.enableWarn !== false;
    this.enableError = options.enableError !== false;
    this.debug('日志级别已更新:', options);
  }

  getHistory(limit: number = this.logHistory.length): LogEntry[] {
    return this.logHistory.slice(-limit);
  }

  clearHistory(): void {
    this.logHistory = [];
    this.debug('日志历史已清空');
  }

  exportLogs(): string {
    return this.logHistory
      .map(log => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`)
      .join('\n');
  }

  captureError(error: Error, context: string = ''): string {
    const errorMessage = `${context}${context ? ': ' : ''}${error.message || 'Unknown error'}`;
    const stack = error.stack || '';
    this.error(errorMessage, 'Stack:', stack);
    return errorMessage;
  }
}

const defaultLogger = new Logger();

export { Logger };
export default defaultLogger;