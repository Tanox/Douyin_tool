// src/utils/buttonDetector.ts - 按钮检测工具（TypeScript迁移中）

import { getElement, getElements, findElementsByStructure } from './dom.js';
import logger from './logger.js';

export class ButtonDetector {
  constructor(options = {}) {
    this.options = {
      buttonTexts: ['Continue', 'Run', 'Execute', 'Next', 'Proceed', 'Start', '继续', '运行', '执行', '下一步', '开始'],
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
      enableLogging: true,
      ...options
    };
  }

  detect(options = {}) {
    const detectionStrategies = options.detectionStrategies || ['text', 'css', 'structure'];
    let button = null;

    for (const strategy of detectionStrategies) {
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
            logger.warn(`ButtonDetector unknown detection strategy: ${strategy}`);
          }
      }

      if (button) {
        if (this.options.enableLogging) {
          logger.info(`ButtonDetector detected button using ${strategy} strategy`);
        }
        break;
      }
    }

    return button;
  }

  detectByText() {
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();

      if (this.options.buttonTexts.includes(trimmedText)) {
        if (this.isClickableElement(element)) {
          return element;
        }

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

  detectByCSS() {
    for (const selector of this.options.cssSelectors) {
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

  detectByStructure() {
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
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();
        if (this.options.buttonTexts.includes(trimmedText)) {
          return element;
        }
      }
    }

    return null;
  }

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
        logger.error('ButtonDetector XPath detection failed:', error);
      }
    }

    return null;
  }

  detectByAccessibility() {
    const accessibilityAttributes = ['aria-label', 'aria-labelledby', 'title', 'alt'];
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

  isClickableElement(element) {
    const clickableTags = ['button', 'input', 'a', 'div', 'span'];
    const clickableRoles = ['button', 'link', 'submit'];

    if (clickableTags.includes(element.tagName.toLowerCase())) {
      const role = element.getAttribute('role');
      if (!role || clickableRoles.includes(role)) {
        return true;
      }
    }

    return false;
  }
}

export default new ButtonDetector();
