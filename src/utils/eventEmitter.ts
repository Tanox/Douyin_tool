import logger from './logger.js';

interface Listener {
  (...args: unknown[]): void;
  originalListener?: Listener;
}

interface EventsMap {
  [event: string]: Listener[];
}

class EventEmitter {
  private events: EventsMap = {};
  private maxListeners: number = 10;

  setMaxListeners(n: number): EventEmitter {
    this.maxListeners = n;
    return this;
  }

  on(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    if (this.events[event].length >= this.maxListeners && !this.events[event].includes(listener)) {
      logger.warn(`警告: 事件'${event}'的监听器数量超过了${this.maxListeners}个。` +
                 `使用setMaxListeners方法可以修改此限制。`);
    }

    this.events[event].push(listener);
    return this;
  }

  once(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    const onceWrapper: Listener = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    onceWrapper.originalListener = listener;
    return this.on(event, onceWrapper);
  }

  off(event?: string, listener?: Listener): EventEmitter {
    if (event === undefined) {
      this.events = {};
      return this;
    }

    if (!this.events[event]) {
      return this;
    }

    if (listener === undefined) {
      this.events[event] = [];
      return this;
    }

    this.events[event] = this.events[event].filter(l => {
      return l !== listener && l.originalListener !== listener;
    });

    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    if (!this.events[event] || this.events[event].length === 0) {
      return false;
    }

    const listeners = [...this.events[event]];

    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        logger.error(`事件'${event}'的监听器执行出错:`, error);
      }
    });

    return true;
  }

  listeners(event: string): Listener[] {
    return this.events[event] || [];
  }

  eventNames(): string[] {
    return Object.keys(this.events).filter(event => this.events[event].length > 0);
  }

  listenerCount(event: string): number {
    return this.events[event] ? this.events[event].length : 0;
  }

  removeAllListeners(event?: string): EventEmitter {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
    return this;
  }

  prependListener(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Listener): EventEmitter {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }

    const onceWrapper: Listener = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    onceWrapper.originalListener = listener;

    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].unshift(onceWrapper);
    return this;
  }
}

const defaultEventEmitter = new EventEmitter();

export { EventEmitter };
export default defaultEventEmitter;