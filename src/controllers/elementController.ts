import logger from '../utils/logger';
import { getElement, getElements } from '../utils/dom';

interface ElementInfo {
  id: string;
  selector: string;
  type: string;
  description: string;
}

interface OriginalStyle {
  [key: string]: string;
}

class ElementController {
  private originalStyles: WeakMap<HTMLElement, OriginalStyle>;
  private elementVisibility: WeakMap<HTMLElement, boolean>;

  constructor() {
    this.originalStyles = new WeakMap();
    this.elementVisibility = new WeakMap();
    logger.info('ElementController 初始化成功');
  }

  async hideElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        this._saveOriginalStyle(element);
        
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.pointerEvents = 'none';
        
        this.elementVisibility.set(element, false);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  async showElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        element.style.display = '';
        
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      
      for (const element of elements) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.pointerEvents = '';
        
        this.elementVisibility.set(element, true);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  async toggleElement(selector: string | HTMLElement): Promise<boolean> {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

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

  modifyElementStyle(selector: string | HTMLElement, styles: Record<string, string>): boolean {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        if (!this.originalStyles.has(element)) {
          this._saveOriginalStyle(element);
        }

        Object.assign(element.style, styles);
      }

      logger.info(`成功修改 ${elements.length} 个元素的样式`);
      return true;
    } catch (error) {
      logger.error(`修改元素样式失败:`, error);
      return false;
    }
  }

  resetElementStyle(selector: string | HTMLElement): boolean {
    try {
      const elements = this._resolveElements(selector);
      
      if (elements.length === 0) {
        logger.warn(`没有找到匹配的元素: ${selector}`);
        return false;
      }

      for (const element of elements) {
        if (this.originalStyles.has(element)) {
          const originalStyle = this.originalStyles.get(element);
          
          element.removeAttribute('style');
          
          if (originalStyle) {
            Object.assign(element.style, originalStyle);
          }
          
          this.originalStyles.delete(element);
          this.elementVisibility.delete(element);
        } else {
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

  identifyElements(): ElementInfo[] {
    try {
      const elements: ElementInfo[] = [];
      let elementId = 1;

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

  private _resolveElements(selector: string | HTMLElement): HTMLElement[] {
    if (!selector) {
      return [];
    }

    if (typeof selector === 'string') {
      return getElements(selector);
    } else if (selector.nodeType === 1) {
      return [selector];
    }

    return [];
  }

  private _saveOriginalStyle(element: HTMLElement): void {
    if (!this.originalStyles.has(element)) {
      const originalStyle: OriginalStyle = {};
      
      const importantProperties = ['display', 'opacity', 'transform', 'pointer-events'];
      importantProperties.forEach(prop => {
        originalStyle[prop] = (element.style as any)[prop];
      });
      
      this.originalStyles.set(element, originalStyle);
    }
  }

  private _generateSelector(element: HTMLElement): string {
    if (!element) return '';

    if (element.id) {
      return `#${element.id}`;
    }

    const specificClasses = Array.from(element.classList).filter(cls => 
      /^(btn|input|card|panel|container|video)/i.test(cls)
    );
    if (specificClasses.length > 0) {
      return `.${specificClasses[0]}`;
    }

    const tagName = element.tagName.toLowerCase();
    const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
    const index = siblings.indexOf(element);
    
    if (siblings.length > 1) {
      return `${tagName}:nth-child(${index + 1})`;
    }

    return tagName;
  }

  private _getElementLabel(element: HTMLElement): string | null {
    const id = element.id;
    if (id) {
      const label = getElement(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }

    if (element.closest('label')) {
      return element.closest('label')!.textContent.trim();
    }

    return element.getAttribute('placeholder') || element.getAttribute('name') || null;
  }
}

const elementController = new ElementController();

export { ElementController };
export default elementController;