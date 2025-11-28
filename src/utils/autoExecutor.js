/**
 * 自动执行控制器模块
 * 负责自动检测和点击界面中的继续/运行按钮，维持任务的持续执行
 */

import { debounce, throttle, getElement, getElements, findElementsByClassPattern, findElementsByStructure } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';

class AutoExecutor {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      // 按钮检测策略：'css', 'xpath', 'text', 'visual', 'accessibility'
      detectionStrategies: ['text', 'css', 'structure'],
      // 支持的按钮文本
      buttonTexts: ['Continue', 'Run', 'Execute', 'Next', 'Proceed', 'Start', '继续', '运行', '执行', '下一步', '开始'],
      // CSS选择器模式
      cssSelectors: [
        'button:contains(Continue)',
        'button:contains(Run)',
        'button:contains(Execute)',
        'button:contains(Next)',
        'button:contains(Proceed)',
        'button:contains(Start)',
        'button:contains(继续)',
        'button:contains(运行)',
        'button:contains(执行)',
        'button:contains(下一步)',
        'button:contains(开始)',
        '.button-primary',
        '.btn-primary',
        '[type="submit"]',
        '.continue-button',
        '.run-button',
        '.execute-button'
      ],
      // 重试配置
      retryConfig: {
        maxAttempts: 10,
        initialDelay: 500,
        backoffFactor: 2
      },
      // 检查间隔（毫秒）
      checkInterval: 1000,
      // 是否启用
      enabled: false,
      // 自定义检测函数
      customDetector: null,
      // 确认机制
      confirmationRequired: false,
      // 执行日志
      enableLogging: true,
      // 截图验证
      captureScreenshots: false,
      // 历史记录最大数量
      maxHistorySize: 100,
      ...options
    };

    this.isRunning = false;
    this.isEmergencyStopped = false;
    this.checkIntervalId = null;
    this.executionHistory = [];
    this.currentAttempt = 0;

    // 初始化日志记录
    if (this.options.enableLogging) {
      logger.info('AutoExecutor initialized with options:', this.options);
    }

    // 监听紧急停止事件
    eventEmitter.on('autoExecutor.emergencyStop', () => {
      this.emergencyStop();
    });
  }

  /**
   * 开始自动执行
   */
  start() {
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

    this.isEmergencyStopped = false;
    // 立即执行一次检测
    this.detectAndClick();

    // 设置定期检查
    this.checkIntervalId = setInterval(() => {
      this.detectAndClick();
    }, this.options.checkInterval);

    // 触发启动事件
    eventEmitter.emit('autoExecutor.started');
  }

  /**
   * 停止自动执行
   */
  stop() {
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

    // 触发停止事件
    eventEmitter.emit('autoExecutor.stopped');
  }

  /**
   * 紧急停止
   */
  emergencyStop() {
    this.isEmergencyStopped = true;
    this.stop();

    if (this.options.enableLogging) {
      logger.error('AutoExecutor emergency stopped');
    }

    // 触发紧急停止事件
    eventEmitter.emit('autoExecutor.emergencyStopped');
  }

  /**
   * 检测并点击按钮
   */
  async detectAndClick() {
    if (this.isEmergencyStopped) {
      return;
    }

    try {
      // 增加尝试次数
      this.currentAttempt++;

      // 检测按钮
      const button = await this.detectButton();

      if (button) {
        // 检查按钮状态
        if (this.isButtonClickable(button)) {
          // 截图验证（如果启用）
          if (this.options.captureScreenshots) {
            this.captureScreenshot('before_click');
          }

          // 点击按钮
          this.clickButton(button);

          // 截图验证（如果启用）
          if (this.options.captureScreenshots) {
            setTimeout(() => {
              this.captureScreenshot('after_click');
            }, 500);
          }

          // 重置尝试次数
          this.currentAttempt = 0;
        }
      } else if (this.currentAttempt >= this.options.retryConfig.maxAttempts) {
        // 达到最大尝试次数
        if (this.options.enableLogging) {
          logger.warn(`AutoExecutor failed to detect button after ${this.currentAttempt} attempts`);
        }

        // 触发重试失败事件
        eventEmitter.emit('autoExecutor.retryFailed', { attempts: this.currentAttempt });

        // 重置尝试次数
        this.currentAttempt = 0;
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor error during detectAndClick:', error);
      }

      // 触发错误事件
      eventEmitter.emit('autoExecutor.error', { error });
    }
  }

  /**
   * 检测按钮
   * @returns {Promise<HTMLElement|null>} 找到的按钮元素或null
   */
  async detectButton() {
    let button = null;

    // 尝试自定义检测函数
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

    // 尝试各种检测策略
    for (const strategy of this.options.detectionStrategies) {
      switch (strategy) {
        case 'text':
          button = this.detectByText();
          break;
        case 'css':
          button = this.detectByCSS();
          break;
        case 'structure':
          button = this.detectByStructure();
          break;
        case 'xpath':
          button = this.detectByXPath();
          break;
        case 'accessibility':
          button = this.detectByAccessibility();
          break;
        default:
          if (this.options.enableLogging) {
            logger.warn(`AutoExecutor unknown detection strategy: ${strategy}`);
          }
      }

      if (button) {
        if (this.options.enableLogging) {
          logger.info(`AutoExecutor detected button using ${strategy} strategy`);
        }
        break;
      }
    }

    return button;
  }

  /**
   * 通过文本检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByText() {
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();

      if (this.options.buttonTexts.includes(trimmedText)) {
        // 检查元素是否可点击
        if (this.isClickableElement(element)) {
          return element;
        }

        // 尝试查找最近的可点击父元素
        let parent = element.parentElement;
        let depth = 0;
        const maxDepth = 5;

        while (parent && depth < maxDepth) {
          if (this.isClickableElement(parent)) {
            return parent;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }

    return null;
  }

  /**
   * 通过CSS选择器检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByCSS() {
    for (const selector of this.options.cssSelectors) {
      // 处理包含文本的选择器
      if (selector.includes(':contains')) {
        const textMatch = selector.match(/:contains\(([^)]+)\)/);
        if (textMatch && textMatch[1]) {
          const text = textMatch[1].replace(/['"]/g, '');
          const baseSelector = selector.replace(/:contains\([^)]+\)/, '');
          const elements = getElements(baseSelector || '*');

          for (const element of elements) {
            if (element.textContent && element.textContent.includes(text)) {
              return element;
            }
          }
        }
      } else {
        const element = getElement(selector);
        if (element) {
          return element;
        }
      }
    }

    return null;
  }

  /**
   * 通过结构检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByStructure() {
    // 查找常见的按钮结构
    const buttonStructures = [
      { tagName: 'button' },
      { tagName: 'input', attributes: { type: 'button' } },
      { tagName: 'input', attributes: { type: 'submit' } },
      { tagName: 'div', attributes: { role: 'button' } },
      { tagName: 'span', attributes: { role: 'button' } },
      { tagName: 'a', attributes: { href: /./ } }
    ];

    for (const structure of buttonStructures) {
      const elements = findElementsByStructure(structure);
      for (const element of elements) {
        // 检查元素文本是否匹配
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();
        if (this.options.buttonTexts.includes(trimmedText)) {
          return element;
        }
      }
    }

    return null;
  }

  /**
   * 通过XPath检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByXPath() {
    try {
      for (const text of this.options.buttonTexts) {
        const xpath = `//*[text()='${text}' or contains(text(),'${text}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;

        if (element) {
          return element;
        }
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('AutoExecutor XPath detection failed:', error);
      }
    }

    return null;
  }

  /**
   * 通过无障碍属性检测按钮
   * @returns {HTMLElement|null} 找到的按钮元素或null
   */
  detectByAccessibility() {
    const accessibilityAttributes = [
      'aria-label',
      'aria-labelledby',
      'title',
      'alt'
    ];

    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      for (const attr of accessibilityAttributes) {
        const value = element.getAttribute(attr);
        if (value) {
          for (const text of this.options.buttonTexts) {
            if (value.includes(text)) {
              return element;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * 检查元素是否可点击
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean} 是否可点击
   */
  isClickableElement(element) {
    const clickableTags = ['button', 'input', 'a', 'div', 'span'];
    const clickableRoles = ['button', 'link', 'submit'];

    // 检查标签名
    if (clickableTags.includes(element.tagName.toLowerCase())) {
      // 检查角色
      const role = element.getAttribute('role');
      if (!role || clickableRoles.includes(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查按钮是否可点击
   * @param {HTMLElement} button - 要检查的按钮
   * @returns {boolean} 是否可点击
   */
  isButtonClickable(button) {
    // 检查元素是否存在
    if (!button) {
      return false;
    }

    // 检查是否被禁用
    if (button.disabled || button.hasAttribute('disabled')) {
      return false;
    }

    // 检查是否隐藏
    if (button.style.display === 'none' || button.style.visibility === 'hidden') {
      return false;
    }

    // 检查是否可见
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    // 检查是否在视口中
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      return false;
    }

    return true;
  }

  /**
   * 压缩历史记录，限制最大数量
   */
  compressHistory() {
    if (this.executionHistory.length > this.options.maxHistorySize) {
      // 只保留最近的maxHistorySize条记录
      this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);
      
      if (this.options.enableLogging) {
        logger.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
      }
    }
  }

  /**
   * 点击按钮
   * @param {HTMLElement} button - 要点击的按钮
   */
  clickButton(button) {
    if (!button) {
      return;
    }

    try {
      // 创建并触发点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      button.dispatchEvent(clickEvent);

      // 记录执行历史
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: true
      });

      // 压缩历史记录
      this.compressHistory();

      if (this.options.enableLogging) {
        logger.info(`AutoExecutor clicked button: ${button.textContent || button.innerText}`);
      }

      // 触发点击事件
      eventEmitter.emit('autoExecutor.buttonClicked', {
        button,
        text: button.textContent || button.innerText,
        selector: this.getElementSelector(button)
      });
    } catch (error) {
      // 记录失败历史
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        buttonText: button.textContent || button.innerText || 'Unknown',
        buttonSelector: this.getElementSelector(button),
        success: false,
        error: error.message
      });

      // 压缩历史记录
      this.compressHistory();

      if (this.options.enableLogging) {
        logger.error('AutoExecutor failed to click button:', error);
      }

      // 触发点击失败事件
      eventEmitter.emit('autoExecutor.buttonClickFailed', {
        button,
        error
      });
    }
  }

  /**
   * 获取元素的选择器
   * @param {HTMLElement} element - 元素
   * @returns {string} 选择器
   */
  getElementSelector(element) {
    if (!element) {
      return '';
    }

    try {
      // 如果元素有ID，使用ID选择器
      if (element.id) {
        return `#${element.id}`;
      }

      // 如果元素有唯一的类名，使用类选择器
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        for (const cls of classes) {
          if (document.querySelectorAll(`.${cls}`).length === 1) {
            return `.${cls}`;
          }
        }
      }

      // 使用标签名和路径
      let path = [];
      let current = element;

      while (current && current.tagName) {
        let selector = current.tagName.toLowerCase();
        
        // 添加类名信息
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/);
          selector += '.' + classes.join('.');
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    } catch (error) {
      return element.tagName.toLowerCase();
    }
  }

  /**
   * 截图验证
   * @param {string} type - 截图类型
   */
  captureScreenshot(type) {
    try {
      // 检查是否支持HTMLCanvasElement
      if (typeof HTMLCanvasElement !== 'undefined') {
        // 这里可以实现截图功能
        // 注意：这需要额外的库支持，如html2canvas
        logger.info(`AutoExecutor capturing screenshot: ${type}`);
      }
    } catch (error) {
      logger.error('AutoExecutor failed to capture screenshot:', error);
    }
  }

  /**
   * 获取执行状态
   * @returns {Object} 执行状态
   */
  getStatus() {
    return {
        isRunning: this.isRunning,
        isEmergencyStopped: this.isEmergencyStopped,
        currentAttempt: this.currentAttempt,
        executionHistory: this.executionHistory.slice(-10), // 返回最近10条记录
        options: this.options
      };
  }

  /**
   * 获取执行历史记录
   * @param {number} limit - 返回记录的最大数量，默认返回全部
   * @returns {Array} 执行历史记录数组
   */
  getExecutionHistory(limit = null) {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * 获取当前尝试次数
   * @returns {number} 当前尝试次数
   */
  getCurrentAttempt() {
    return this.currentAttempt;
  }

  /**
   * 更新配置
   * @param {Object} newOptions - 新的配置选项
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    if (this.options.enableLogging) {
      logger.info('AutoExecutor options updated:', newOptions);
    }
  }
}

export default new AutoExecutor();