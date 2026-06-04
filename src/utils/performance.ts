import logger from './logger';

interface PerformanceMonitorOptions {
  enableFpsMonitor?: boolean;
  enableMemoryMonitor?: boolean;
  sampleInterval?: number;
}

interface FpsRecord {
  timestamp: number;
  value: number;
}

interface MemoryRecord {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExecutionTimeRecord {
  timestamp: number;
  duration: number;
}

interface RenderTimeRecord {
  timestamp: number;
  duration: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercent: number;
}

interface PerformanceMetrics {
  fps: FpsRecord[];
  memory: MemoryRecord[];
  executionTimes: Record<string, ExecutionTimeRecord[]>;
  renderTimes: RenderTimeRecord[];
}

interface PerformanceHealth {
  isHealthy: boolean;
  fpsHealthy: boolean;
  memoryHealthy: boolean;
  currentFps: number;
  averageFps: number;
  memoryUsage: string;
}

interface WatchResult {
  stop: () => void;
}

class PerformanceMonitor {
  private enableFpsMonitor: boolean;
  private enableMemoryMonitor: boolean;
  private sampleInterval: number;
  private metrics: PerformanceMetrics;
  private isMonitoring: boolean;
  private fpsMonitorId: number | null;
  private memoryMonitorId: ReturnType<typeof setInterval> | null;
  private lastTime: number;
  private frameCount: number;
  private fpsHistory: number[];
  private maxFpsHistory: number;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.enableFpsMonitor = options.enableFpsMonitor !== false;
    this.enableMemoryMonitor = options.enableMemoryMonitor !== false;
    this.sampleInterval = options.sampleInterval || 1000;

    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };

    this.isMonitoring = false;
    this.fpsMonitorId = null;
    this.memoryMonitorId = null;

    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.maxFpsHistory = 60;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    if (this.enableFpsMonitor && typeof window.requestAnimationFrame === 'function') {
      this.lastTime = performance.now();
      this.frameCount = 0;
      this._startFpsMonitoring();
    }

    if (this.enableMemoryMonitor && (performance as unknown as { memory: MemoryInfo }).memory) {
      this.memoryMonitorId = setInterval(() => {
        this._collectMemoryMetrics();
      }, this.sampleInterval);
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.fpsMonitorId) {
      cancelAnimationFrame(this.fpsMonitorId);
      this.fpsMonitorId = null;
    }

    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }

  private _startFpsMonitoring(): void {
    if (!this.isMonitoring) return;

    this.fpsMonitorId = requestAnimationFrame((currentTime) => {
      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this._recordFps(fps);

        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this._startFpsMonitoring();
    });
  }

  private _recordFps(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    this.metrics.fps.push({
      timestamp: Date.now(),
      value: fps
    });
  }

  private _collectMemoryMetrics(): void {
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!memory) return;

    const memoryInfo: MemoryRecord = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };

    this.metrics.memory.push(memoryInfo);
  }

  measureExecutionTime<T>(id: string, fn: () => T): T {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - startTime;

      if (!this.metrics.executionTimes[id]) {
        this.metrics.executionTimes[id] = [];
      }

      this.metrics.executionTimes[id].push({
        timestamp: Date.now(),
        duration
      });

      return result;
    } catch (error) {
      logger.error(`测量执行时间出错 [${id}]:`, error);
      throw error;
    }
  }

  startRenderMeasurement(): () => number {
    const startTime = performance.now();

    return (): number => {
      const duration = performance.now() - startTime;
      this.metrics.renderTimes.push({
        timestamp: Date.now(),
        duration
      });
      return duration;
    };
  }

  getCurrentFps(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1];
  }

  getAverageFps(samples: number = 10): number {
    if (this.fpsHistory.length === 0) return 0;

    const recentSamples = this.fpsHistory.slice(-samples);
    const sum = recentSamples.reduce((acc, fps) => acc + fps, 0);
    return Math.round(sum / recentSamples.length);
  }

  getMemoryInfo(): MemoryInfo | null {
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    if (!memory) return null;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    };
  }

  getMetrics() {
    return {
      fps: [...this.metrics.fps],
      memory: [...this.metrics.memory],
      executionTimes: { ...this.metrics.executionTimes },
      renderTimes: [...this.metrics.renderTimes],
      currentFps: this.getCurrentFps(),
      averageFps: this.getAverageFps(),
      memoryInfo: this.getMemoryInfo()
    };
  }

  clearMetrics(): void {
    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };
    this.fpsHistory = [];
  }

  exportReport(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  checkPerformanceHealth(): PerformanceHealth {
    const avgFps = this.getAverageFps();
    const memoryInfo = this.getMemoryInfo();

    return {
      isHealthy: avgFps >= 30 && (!memoryInfo || memoryInfo.usedPercent < 80),
      fpsHealthy: avgFps >= 30,
      memoryHealthy: !memoryInfo || memoryInfo.usedPercent < 80,
      currentFps: this.getCurrentFps(),
      averageFps: avgFps,
      memoryUsage: memoryInfo ? `${memoryInfo.usedPercent}%` : 'N/A'
    };
  }

  watchPerformance(callback: (health: PerformanceHealth) => void): WatchResult {
    const checkInterval = setInterval(() => {
      const health = this.checkPerformanceHealth();
      if (!health.isHealthy) {
        callback(health);
      }
    }, 5000) as unknown as number;

    return {
      stop: () => clearInterval(checkInterval as unknown as number)
    };
  }
}

const defaultPerformanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor };
export default defaultPerformanceMonitor;