// src/controllers/elementController.js

import { logger } from '../utils/logger.js';
import { getElement, getElements } from '../utils/dom.js';

/**
 * 元素控制器类
 */
class ElementController {
  /**
   * 构造函数
   */
  constructor() {
    // 存储被操作元素的原始样式信息
    this.originalStyles = new WeakMap();
    // 存储元素的显示/隐藏状态
    this.elementVisibility = new WeakMap();
    logger.info('ElementController 初始化成功');
  }

  /**
   * 隐藏指定的元素，使用CSS变换实现平滑过渡效果
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 隐藏是否成功
   */
  async hideElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 保存原始样式
        this._saveOriginalStyle(element);
        
        // 添加过渡效果
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.pointerEvents = 'none';
        
        // 标记为隐藏
        this.elementVisibility.set(element, false);
      }

      // 等待过渡动画完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 完全隐藏元素
      for (const element of elements) {
        element.style.display = 'none';
      }

      logger.info(`成功隐藏 ${elements.length} 个元素`);
      return true;
    } catch (error) {
      logger.error(`隐藏元素失败:`, error);
      return false;
    }
  }

  /**
   * 显示指定的元素，恢复之前隐藏的元素状态
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 显示是否成功
   */
  async showElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 移除display: none
        element.style.display = '';
        
        // 添加过渡效果
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
      }

      // 强制重排
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 显示元素
      for (const element of elements) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.pointerEvents = '';
        
        // 标记为显示
        this.elementVisibility.set(element, true);
      }

      // 等待过渡动画完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 清理过渡样式
      for (const element of elements) {
        element.style.transition = '';
      }

      logger.info(`成功显示 ${elements.length} 个元素`);
      return true;
    } catch (error) {
      logger.error(`显示元素失败:`, error);
      return false;
    }
  }

  /**
   * 切换元素的显示/隐藏状态，根据当前状态自动切换
   * @param {String|Element} selector - CSS选择器或DOM元素，支持单个元素或元素集合
   * @returns {Promise<Boolean>} 切换后的显示状态（true表示显示，false表示隐藏）
   */
  async toggleElement(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      // 确定是否需要显示或隐藏（基于第一个元素的状态）
      const firstElement = elements[0];
      const currentVisibility = this.elementVisibility.get(firstElement) !== false && 
                               firstElement.style.display !== 'none';
      const targetVisibility = !currentVisibility;

      if (targetVisibility) {
        await this.showElement(selector);
      } else {
        await this.hideElement(selector);
      }

      return targetVisibility;
    } catch (error) {
      logger.error(`切换元素状态失败:`, error);
      return false;
    }
  }

  /**
   * 修改元素的样式
   * @param {String|Element} selector - CSS选择器或DOM元素
   * @param {Object} styles - 样式对象
   * @returns {Boolean} 操作是否成功
   */
  modifyElementStyle(selector, styles) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 保存原始样式（如果还没有保存）
        if (!this.originalStyles.has(element)) {
          this._saveOriginalStyle(element);
        }

        // 应用新样式
        Object.assign(element.style, styles);
      }

      logger.info(`成功修改 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`修改元素样式失败:`, error);
      return false;
    }
  }

  /**
   * 重置元素的样式为默认状态
   * @param {String|Element} selector - CSS选择器或DOM元素
   * @returns {Boolean} 操作是否成功
   */
  resetElementStyle(selector) {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        // 如果有保存的原始样式，则恢复
        if (this.originalStyles.has(element)) {
          const originalStyle = this.originalStyles.get(element);
          
          // 清除所有样式
          element.removeAttribute('style');
          
          // 恢复必要的样式属性（如果有）
          if (originalStyle) {
            Object.assign(element.style, originalStyle);
          }
          
          // 清除存储的信息
          this.originalStyles.delete(element);
          this.elementVisibility.delete(element);
        } else {
          // 直接清除样式
          element.removeAttribute('style');
        }
      }

      logger.info(`成功重置 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`重置元素样式失败:`, error);
      return false;
    }
  }

  /**
   * 识别页面中的所有可操作元素
   * @returns {Array<{id: String, selector: String, type: String, description: String}>} 元素列表
   */
  identifyElements() {
    try {
      const elements = [];
      let elementId = 1;

      // 识别按钮元素
      const buttons = getElements('button, [role="button"], .btn, .button, .action');
      buttons.forEach(button => {
        const selector = this._generateSelector(button);
        const description = button.textContent?.trim() || button.getAttribute('aria-label') || '按钮';
        elements.push({
          id: `btn_${elementId++}`,
          selector: selector,
          type: 'button',
          description: description
        });
      });

      // 识别输入元素
      const inputs = getElements('input, textarea, select');
      inputs.forEach(input => {
        const selector = this._generateSelector(input);
        const label = this._getElementLabel(input);
        elements.push({
          id: `input_${elementId++}`,
          selector: selector,
          type: 'input',
          description: label || '输入框'
        });
      });

      // 识别容器元素
      const containers = getElements('.container, .wrapper, .section, .card, .panel');
      containers.forEach(container => {
        const selector = this._generateSelector(container);
        elements.push({
          id: `container_${elementId++}`,
          selector: selector,
          type: 'container',
          description: `容器 - ${container.classList.value}`
        });
      });

      // 识别视频相关元素
      const videoElements = getElements('video, .video, .player');
      videoElements.forEach(video => {
        const selector = this._generateSelector(video);
        elements.push({
          id: `video_${elementId++}`,
          selector: selector,
          type: 'video',
          description: '视频元素'
        });
      });

      logger.info(`成功识别 ${elements.length} 个可操作元素`);
      return elements;
    } catch (error) {
      logger.error(`识别元素失败:`, error);
      return [];
    }
  }

  /**
   * 解析选择器或元素为元素数组
   * @private
   * @param {String|Element|Array<Element>} selector - CSS选择器或DOM元素或元素数组
   * @returns {Array<Element>} 元素数组
   */
  _resolveElements(selector) {
    if (!selector) {
      return [];
    }

    if (typeof selector === 'string') {
      return getElements(selector);
    } else if (selector.nodeType === 1) {
      return [selector];
    } else if (Array.isArray(selector)) {
      return selector.filter(el => el && el.nodeType === 1);
    }

    return [];
  }

  /**
   * 保存元素的原始样式
   * @private
   * @param {Element} element - DOM元素
   */
  _saveOriginalStyle(element) {
    if (!this.originalStyles.has(element)) {
      const computedStyle = window.getComputedStyle(element);
      const originalStyle = {};
      
      // 保存关键样式属性
      const importantProperties = ['display', 'opacity', 'transform', 'pointer-events'];
      importantProperties.forEach(prop => {
        originalStyle[prop] = element.style[prop];
      });
      
      this.originalStyles.set(element, originalStyle);
    }
  }

  /**
   * 生成元素的唯一选择器
   * @private
   * @param {Element} element - DOM元素
   * @returns {String} CSS选择器
   */
  _generateSelector(element) {
    if (!element) return '';

    // 如果有id，优先使用id选择器
    if (element.id) {
      return `#${element.id}`;
    }

    // 如果有特定的类，使用类选择器
    const specificClasses = Array.from(element.classList).filter(cls => 
      /^(btn|input|card|panel|container|video)/i.test(cls)
    );
    if (specificClasses.length > 0) {
      return `.${specificClasses[0]}`;
    }

    // 使用标签名和位置
    const tagName = element.tagName.toLowerCase();
    const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
    const index = siblings.indexOf(element);
    
    if (siblings.length > 1) {
      return `${tagName}:nth-child(${index + 1})`;
    }

    return tagName;
  }

  /**
   * 获取元素的标签文本
   * @private
   * @param {Element} element - DOM元素
   * @returns {String} 标签文本
   */
  _getElementLabel(element) {
    // 查找关联的label元素
    const id = element.id;
    if (id) {
      const label = getElement(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }

    // 查找父元素中的label
    if (element.closest('label')) {
      return element.closest('label').textContent.trim();
    }

    // 返回placeholder或name属性
    return element.getAttribute('placeholder') || element.getAttribute('name');
  }
}

// 创建并导出元素控制器实例
const elementController = new ElementController();

export { ElementController };
export default elementController;