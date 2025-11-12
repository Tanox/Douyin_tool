/**
 * 性能监控工具模块
 * 提供性能监控、指标收集、帧率监控等功能
 */

class PerformanceMonitor {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {boolean} options.enableFpsMonitor - 是否启用帧率监控
   * @param {boolean} options.enableMemoryMonitor - 是否启用内存监控
   * @param {number} options.sampleInterval - 采样间隔(ms)
   */
  constructor(options = {}) {
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
    this.maxFpsHistory = 60; // 保存最近60帧的数据
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 启动帧率监控
    if (this.enableFpsMonitor && window.requestAnimationFrame) {
      this.lastTime = performance.now();
      this.frameCount = 0;
      this._startFpsMonitoring();
    }
    
    // 启动内存监控
    if (this.enableMemoryMonitor && performance.memory) {
      this.memoryMonitorId = setInterval(() => {
        this._collectMemoryMetrics();
      }, this.sampleInterval);
    }
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // 停止帧率监控
    if (this.fpsMonitorId) {
      cancelAnimationFrame(this.fpsMonitorId);
      this.fpsMonitorId = null;
    }
    
    // 停止内存监控
    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }

  /**
   * 内部方法：开始帧率监控
   * @private
   */
  _startFpsMonitoring() {
    if (!this.isMonitoring) return;
    
    this.fpsMonitorId = requestAnimationFrame((currentTime) => {
      this.frameCount++;
      const deltaTime = currentTime - this.lastTime;
      
      // 每秒计算一次FPS
      if (deltaTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this._recordFps(fps);
        
        // 重置计数器
        this.frameCount = 0;
        this.lastTime = currentTime;
      }
      
      this._startFpsMonitoring();
    });
  }

  /**
   * 内部方法：记录FPS
   * @private
   * @param {number} fps - 帧率值
   */
  _recordFps(fps) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }
    
    this.metrics.fps.push({
      timestamp: Date.now(),
      value: fps
    });
  }

  /**
   * 内部方法：收集内存指标
   * @private
   */
  _collectMemoryMetrics() {
    if (!performance.memory) return;
    
    const memoryInfo = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
    
    this.metrics.memory.push(memoryInfo);
  }

  /**
   * 记录函数执行时间
   * @param {string} id - 执行标记ID
   * @param {Function} fn - 要执行的函数
   * @returns {*} 函数执行结果
   */
  measureExecutionTime(id, fn) {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      // 记录执行时间
      if (!this.metrics.executionTimes[id]) {
        this.metrics.executionTimes[id] = [];
      }
      
      this.metrics.executionTimes[id].push({
        timestamp: Date.now(),
        duration
      });
      
      return result;
    } catch (error) {
      console.error(`测量执行时间出错 [${id}]:`, error);
      throw error;
    }
  }

  /**
   * 开始测量渲染时间
   * @returns {Function} 结束测量的函数
   */
  startRenderMeasurement() {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.metrics.renderTimes.push({
        timestamp: Date.now(),
        duration
      });
      return duration;
    };
  }

  /**
   * 获取当前FPS
   * @returns {number} 当前帧率
   */
  getCurrentFps() {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1];
  }

  /**
   * 获取平均FPS
   * @param {number} samples - 样本数量
   * @returns {number} 平均帧率
   */
  getAverageFps(samples = 10) {
    if (this.fpsHistory.length === 0) return 0;
    
    const recentSamples = this.fpsHistory.slice(-samples);
    const sum = recentSamples.reduce((acc, fps) => acc + fps, 0);
    return Math.round(sum / recentSamples.length);
  }

  /**
   * 获取内存使用情况
   * @returns {Object|null} 内存信息或null
   */
  getMemoryInfo() {
    if (!performance.memory) return null;
    
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    };
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标数据
   */
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

  /**
   * 清除性能指标数据
   */
  clearMetrics() {
    this.metrics = {
      fps: [],
      memory: [],
      executionTimes: {},
      renderTimes: []
    };
    this.fpsHistory = [];
  }

  /**
   * 导出性能报告
   * @returns {string} JSON格式的性能报告
   */
  exportReport() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * 检查性能是否良好
   * @returns {Object} 性能状态对象
   */
  checkPerformanceHealth() {
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

  /**
   * 监听性能问题
   * @param {Function} callback - 性能问题回调函数
   * @returns {Object} 包含stop方法的控制对象
   */
  watchPerformance(callback) {
    const checkInterval = setInterval(() => {
      const health = this.checkPerformanceHealth();
      if (!health.isHealthy) {
        callback(health);
      }
    }, 5000); // 每5秒检查一次
    
    return {
      stop: () => clearInterval(checkInterval)
    };
  }
}

// 创建默认实例
const defaultPerformanceMonitor = new PerformanceMonitor();

// 导出类和默认实例
export { PerformanceMonitor };
export default defaultPerformanceMonitor;