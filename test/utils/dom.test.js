/**
 * DOM工具函数测试
 */

import {
  debounce,
  throttle,
  getElement,
  getElements,
  findElementsByClassPattern,
  findElementsByStructure,
  toggleElements,
  addClass,
  removeClass,
  addEvent,
  removeEvent,
  createElement,
  injectStyle
} from '../../src/utils/dom.js';

// 模拟logger
jest.mock('../../src/utils/logger.js', () => ({
  error: jest.fn()
}));

describe('DOM工具函数', () => {
  // 清理DOM
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('应该在指定时间后执行函数', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      // 调用函数
      debouncedFn();
      // 立即检查，函数不应该被调用
      expect(mockFn).not.toHaveBeenCalled();

      // 等待100ms
      jest.advanceTimersByTime(100);
      // 函数应该被调用
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('应该在多次调用时只执行最后一次', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      // 多次调用
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      // 等待100ms
      jest.advanceTimersByTime(100);
      // 函数应该只被调用一次
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    test('应该在时间限制内只执行一次', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      // 第一次调用
      throttledFn('first');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // 立即再次调用
      throttledFn('second');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // 等待100ms
      jest.advanceTimersByTime(100);
      // 再次调用
      throttledFn('third');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('third');
    });
  });

  describe('getElement', () => {
    test('应该返回匹配的元素', () => {
      // 创建测试元素
      const div = document.createElement('div');
      div.id = 'test-div';
      document.body.appendChild(div);

      // 测试getElement
      const result = getElement('#test-div');
      expect(result).toBe(div);
    });

    test('当元素不存在时应该返回null', () => {
      const result = getElement('#non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getElements', () => {
    test('应该返回匹配的元素数组', () => {
      // 创建测试元素
      const div1 = document.createElement('div');
      div1.className = 'test-class';
      const div2 = document.createElement('div');
      div2.className = 'test-class';
      document.body.appendChild(div1);
      document.body.appendChild(div2);

      // 测试getElements
      const result = getElements('.test-class');
      expect(result).toHaveLength(2);
      expect(result).toContain(div1);
      expect(result).toContain(div2);
    });

    test('当没有匹配元素时应该返回空数组', () => {
      const result = getElements('.non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('findElementsByClassPattern', () => {
    test('应该返回匹配类名模式的元素', () => {
      // 创建测试元素
      const div1 = document.createElement('div');
      div1.className = 'test-class-1';
      const div2 = document.createElement('div');
      div2.className = 'test-class-2';
      const div3 = document.createElement('div');
      div3.className = 'other-class';
      document.body.appendChild(div1);
      document.body.appendChild(div2);
      document.body.appendChild(div3);

      // 测试findElementsByClassPattern
      const result = findElementsByClassPattern(/test-class-/);
      expect(result).toHaveLength(2);
      expect(result).toContain(div1);
      expect(result).toContain(div2);
    });
  });

  describe('findElementsByStructure', () => {
    test('应该返回匹配结构的元素', () => {
      // 创建测试元素
      const div = document.createElement('div');
      const span = document.createElement('span');
      span.setAttribute('class', 'test-span');
      div.appendChild(span);
      document.body.appendChild(div);

      // 测试findElementsByStructure
      const result = findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'span',
          attributes: { class: 'test-span' }
        }]
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(div);
    });
  });

  describe('toggleElements', () => {
    test('应该显示元素', () => {
      // 创建测试元素
      const div = document.createElement('div');
      div.style.display = 'none';
      document.body.appendChild(div);

      // 测试toggleElements显示
      toggleElements(div, true);
      expect(div.style.display).toBe('');
    });

    test('应该隐藏元素', () => {
      // 创建测试元素
      const div = document.createElement('div');
      document.body.appendChild(div);

      // 测试toggleElements隐藏
      toggleElements(div, false);
      expect(div.style.display).toBe('none');
    });
  });

  describe('addClass', () => {
    test('应该添加单个类', () => {
      // 创建测试元素
      const div = document.createElement('div');
      document.body.appendChild(div);

      // 测试addClass
      addClass(div, 'test-class');
      expect(div.classList.contains('test-class')).toBe(true);
    });

    test('应该添加多个类', () => {
      // 创建测试元素
      const div = document.createElement('div');
      document.body.appendChild(div);

      // 测试addClass
      addClass(div, ['class1', 'class2']);
      expect(div.classList.contains('class1')).toBe(true);
      expect(div.classList.contains('class2')).toBe(true);
    });
  });

  describe('removeClass', () => {
    test('应该移除单个类', () => {
      // 创建测试元素
      const div = document.createElement('div');
      div.className = 'test-class';
      document.body.appendChild(div);

      // 测试removeClass
      removeClass(div, 'test-class');
      expect(div.classList.contains('test-class')).toBe(false);
    });

    test('应该移除多个类', () => {
      // 创建测试元素
      const div = document.createElement('div');
      div.className = 'class1 class2';
      document.body.appendChild(div);

      // 测试removeClass
      removeClass(div, ['class1', 'class2']);
      expect(div.classList.contains('class1')).toBe(false);
      expect(div.classList.contains('class2')).toBe(false);
    });
  });

  describe('createElement', () => {
    test('应该创建带有属性和子元素的元素', () => {
      // 测试createElement
      const div = createElement('div', {
        className: 'test-div',
        style: { color: 'red' }
      }, [
        'Hello ',
        createElement('span', {}, ['World'])
      ]);

      expect(div.tagName).toBe('DIV');
      expect(div.classList.contains('test-div')).toBe(true);
      expect(div.style.color).toBe('red');
      expect(div.textContent).toBe('Hello World');
    });
  });

  describe('injectStyle', () => {
    test('应该注入样式到页面', () => {
      // 测试injectStyle
      const styleElement = injectStyle('body { background: red; }');
      
      expect(styleElement).toBeInstanceOf(HTMLStyleElement);
      expect(styleElement.textContent).toBe('body { background: red; }');
      expect(document.head.contains(styleElement)).toBe(true);
    });
  });
});
