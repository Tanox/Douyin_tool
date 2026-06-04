import { getElement, getElements, findElementsByStructure } from './dom';
import logger from './logger';

interface ButtonDetectorOptions {
  buttonTexts?: string[];
  cssSelectors?: string[];
  enableLogging?: boolean;
}

export class ButtonDetector {
  private options: ButtonDetectorOptions;

  constructor(options: ButtonDetectorOptions = {}) {
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

  detect(options: { detectionStrategies?: string[] } = {}): HTMLElement | null {
    const detectionStrategies = options.detectionStrategies || ['text', 'css', 'structure'];
    let button: HTMLElement | null = null;

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

  private detectByText(): HTMLElement | null {
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      const text = element.textContent || '';
      const trimmedText = text.trim();

      if (this.options.buttonTexts?.includes(trimmedText)) {
        if (this.isClickableElement(element as HTMLElement)) {
          return element as HTMLElement;
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

  private detectByCSS(): HTMLElement | null {
    for (const selector of this.options.cssSelectors || []) {
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

  private detectByStructure(): HTMLElement | null {
    const buttonStructures = [
      { tagName: 'button' },
      { tagName: 'input', attributes: { type: 'button' } },
      { tagName: 'input', attributes: { type: 'submit' } },
      { tagName: 'div', attributes: { role: 'button' } },
      { tagName: 'span', attributes: { role: 'button' } }
    ];

    for (const structure of buttonStructures) {
      const elements = findElementsByStructure(structure as any);
      for (const element of elements) {
        const text = element.textContent || '';
        const trimmedText = text.trim();
        if (this.options.buttonTexts?.includes(trimmedText)) {
          return element;
        }
      }
    }

    return null;
  }

  private detectByXPath(): HTMLElement | null {
    try {
      for (const text of this.options.buttonTexts || []) {
        const xpath = `//*[text()='${text}' or contains(text(),'${text}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const element = result.singleNodeValue;

        if (element) {
          return element as HTMLElement;
        }
      }
    } catch (error) {
      if (this.options.enableLogging) {
        logger.error('ButtonDetector XPath detection failed:', error);
      }
    }

    return null;
  }

  private detectByAccessibility(): HTMLElement | null {
    const accessibilityAttributes = ['aria-label', 'aria-labelledby', 'title', 'alt'];
    const allElements = document.getElementsByTagName('*');

    for (const element of allElements) {
      for (const attr of accessibilityAttributes) {
        const value = element.getAttribute(attr);
        if (value) {
          for (const text of this.options.buttonTexts || []) {
            if (value.includes(text)) {
              return element as HTMLElement;
            }
          }
        }
      }
    }

    return null;
  }

  private isClickableElement(element: HTMLElement): boolean {
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