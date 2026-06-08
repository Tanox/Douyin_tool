import { debounce, throttle, getElement, getElements, findElementsByClassPattern, findElementsByStructure } from './dom';
import logger from './logger';
import eventEmitter from './eventEmitter';
import buttonDetector from './buttonDetector';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  backoffFactor: number;
}

interface AutoExecutorOptions {
  detectionStrategies?: string[];
  retryConfig?: RetryConfig;
  checkInterval?: number;
  enabled?: boolean;
  customDetector?: () => HTMLElement | null;
  confirmationRequired?: boolean;
  enableLogging?: boolean;
  captureScreenshots?: boolean;
  maxHistorySize?: number;
}

interface ExecutionRecord {
  timestamp: string;
  buttonText: string;
  buttonSelector: string;
  success: boolean;
  error?: string;
}

interface ButtonClickEvent {
  button: HTMLElement;
  text: string | null;
  selector: string;
}

class AutoExecutor {
  private options: Required<AutoExecutorOptions>;
  private isRunning: boolean;
  private isEmergencyStopped: boolean;
  private checkIntervalId: ReturnType<typeof setInterval> | null;
  private executionHistory: ExecutionRecord[];
  private currentAttempt: number;

  constructor(options: AutoExecutorOptions = {}) {
    this.options = {
      detectionStrategies: ['text', 'css', 'structure'],
      retryConfig: {
        maxAttempts: 10,
        initialDelay: 500,
        backoffFactor: 2
      },
      checkInterval: 1000,
      enabled: false,
      customDetector: (() => null) as () => HTMLElement | null,
      confirmationRequired: false,
      enableLogging: true,
      captureScreenshots: false,
      maxHistorySize: 100,
      ...options
    };

    this.isRunning = false;
    this.isEmergencyStopped = false;
    this.checkIntervalId = null;
    this.executionHistory = [];
    this.currentAttempt = 0;

    if (this.options.enableLogging) {
      logger.info('AutoExecutor initialized with options:', this.options);
    }

    eventEmitter.on('autoExecutor.emergencyStop', () => {
      this.emergencyStop();
    });
  }

  start(): void {
    if (this.isRunning) {
      if (this.options.enableLogging) {
        logger.warn('AutoExecutor is already running');
      }
      return;
    }

    if (this.options.confirmationRequired) {
      const confirmed = confirm('确认要启动自动执行控制器吗？这将自动点击界面中的按钮。');
      if (!confirmed) {
        return;
      }
    }

    this.isRunning = true;
    this.isEmergencyStopped = false;
    this.currentAttempt = 0;

    if (this.options.enableLogging) {
      logger.info('AutoExecutor started');
    }
    this.detectAndClick();

    this.checkIntervalId = setInterval(() => {
      this.detectAndClick();
    }, this.options.checkInterval);

    eventEmitter.emit('autoExecutor.started');
  }

  stop(): void {
    if (!this.isRunning) {
      if (this.options.enableLogging) {
        logger.warn('AutoExecutor is not running');
      }
      return;
    }

    this.isRunning = false;
    this.isEmergencyStopped = false;

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }

    if (this.options.enableLogging) {
      logger.info('AutoExecutor stopped');
    }

    eventEmitter.emit('autoExecutor.stopped');
  }

  emergencyStop(): void {
    this.isEmergencyStopped = true;
    this.stop();

    if (this.options.enableLogging) {
      logger.error('AutoExecutor emergency stopped');
    }

    eventEmitter.emit('autoExecutor.emergencyStopped');
  }

  private async detectAndClick(): Promise<void> {
    if (this.isEmergencyStopped) {
      return;
    }

    try {
      this.currentAttempt++;

      const button = await this.detectButton();

      if (button) {
        if (this.isButtonClickable(button)) {
          if (this.options.captureScreenshots) {
            this.captureScreenshot('before_click');
          }

          this.clickButton(button);

          if (this.options.captureScreenshots) {
            setTimeout(() => {
              this.captureScreenshot('after_click');
            }, 500);
          }

          this.currentAttempt = 0;
        }
      } else if (this.currentAttempt >= this.options.retryConfig.maxAttempts) {
        if (this.options.enableLogging) {
          logger.warn(`AutoExecutor failed to detect button after ${this.currentAttempt} attempts`);
        }

        eventEmitter.emit('autoExecutor.retryFailed', { attempts: this.currentAttempt });
        this.currentAttempt = 0;
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor error during detectAndClick:', error);
      }

      eventEmitter.emit('autoExecutor.error', { error });
    }
  }

  private async detectButton(): Promise<HTMLElement | null> {
    let button: HTMLElement | null = null;

    if (this.options.customDetector) {
      try {
        button = this.options.customDetector();
        if (button) {
          if (this.options.enableLogging) {
            logger.info('AutoExecutor detected button using custom detector');
          }
          return button;
        }
      } catch (error) {
        if (this.options.enableLogging) {
          logger.warn('AutoExecutor custom detector failed:', error);
        }
      }
    }

    const detectorOptions = {
      detectionStrategies: this.options.detectionStrategies
    };
    button = buttonDetector.detect(detectorOptions);

    return button;
  }

  private isButtonClickable(button: HTMLElement): boolean {
    if (!button) return false;
    if (('disabled' in button && (button as any).disabled) || button.hasAttribute('disabled')) return false;
    if (button.style.display === 'none' || button.style.visibility === 'hidden') return false;

    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      return false;
    }

    return true;
  }

  private compressHistory(): void {
    if (this.executionHistory.length > this.options.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
      }
    }
  }

  private clickButton(button: HTMLElement): void {
    if (!button) return;

    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      button.dispatchEvent(clickEvent);

      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: true
      });

      this.compressHistory();

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor clicked button: ${button.textContent || button.innerText}`);
      }

      eventEmitter.emit('autoExecutor.buttonClicked', {
        button,
        text: button.textContent || button.innerText,
        selector: this.getElementSelector(button)
      });
    } catch (error) {
      const err = error as Error;
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: false,
        error: err.message
      });

      this.compressHistory();

      if (this.options.enableLogging) {
        logger.error('AutoExecutor failed to click button:', error);
      }

      eventEmitter.emit('autoExecutor.buttonClickFailed', {
        button,
        error
      });
    }
  }

  private getElementSelector(element: HTMLElement | null): string {
    if (!element) return '';

    try {
      if (element.id) {
        return `#${element.id}`;
      }

      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        for (const cls of classes) {
          if (document.querySelectorAll(`.${cls}`).length === 1) {
            return `.${cls}`;
          }
        }
      }

      const path: string[] = [];
      let current: HTMLElement | null = element;

      while (current && current.tagName) {
        let selector = current.tagName.toLowerCase();

        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/);
          selector += '.' + classes.join('.');
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    } catch {
      return element.tagName.toLowerCase();
    }
  }

  private captureScreenshot(type: string): void {
    try {
      if (typeof HTMLCanvasElement !== 'undefined') {
        logger.info(`AutoExecutor capturing screenshot: ${type}`);
      }
    } catch (error) {
      logger.error('AutoExecutor failed to capture screenshot:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isEmergencyStopped: this.isEmergencyStopped,
      currentAttempt: this.currentAttempt,
      executionHistory: this.executionHistory.slice(-10),
      options: this.options
    };
  }

  getExecutionHistory(limit: number | null = null): ExecutionRecord[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  updateOptions(newOptions: Partial<AutoExecutorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    if (this.options.enableLogging) {
      logger.info('AutoExecutor options updated:', newOptions);
    }
  }
}

export default new AutoExecutor();