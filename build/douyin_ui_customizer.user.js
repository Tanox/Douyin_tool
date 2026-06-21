// ==UserScript==
// @name         抖音Web端界面UI定制工具
// @namespace    https://github.com/sutchan
// @version      2.0.4
// @description  自定义抖音Web端界面，隐藏不需要的UI元素，提升观看体验
// @author       Sut (@sutchan)
// @match        https://www.douyin.com/*
// @match        https://v.douyin.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @run-at       document-end
// @icon         https://www.douyin.com/favicon.ico
// @updateURL
// @downloadURL
// ==/UserScript==


"use strict";
(() => {
  // src/utils/logger.ts
  function isProduction() {
    try {
      if (typeof window !== "undefined" && window.location) {
        const host = window.location.hostname;
        return host !== "localhost" && host !== "127.0.0.1" && host !== "";
      }
    } catch {
    }
    return true;
  }
  var Logger = class {
    constructor(options = {}) {
      this.prefix = options.prefix || "[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177]";
      this.isProd = options.enableProduction ?? isProduction();
      this.enableDebug = this.isProd ? false : options.enableDebug !== false;
      this.enableInfo = this.isProd ? false : options.enableInfo !== false;
      this.enableWarn = options.enableWarn !== false;
      this.enableError = options.enableError !== false;
      this.logHistory = [];
      this.maxHistorySize = options.maxHistorySize || 100;
    }
    _formatMessage(level, ...args) {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      const formattedArgs = args.map((arg) => {
        if (typeof arg === "object" && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(" ");
      return `[${timestamp}] ${this.prefix} [${level}] ${formattedArgs}`;
    }
    _addToHistory(level, message) {
      this.logHistory.push({
        timestamp: Date.now(),
        level,
        message
      });
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.shift();
      }
    }
    debug(...args) {
      if (!this.enableDebug) return;
      const message = this._formatMessage("DEBUG", ...args);
      console.debug(message);
      this._addToHistory("DEBUG", message);
    }
    info(...args) {
      if (!this.enableInfo) return;
      const message = this._formatMessage("INFO", ...args);
      console.info(message);
      this._addToHistory("INFO", message);
    }
    warn(...args) {
      if (!this.enableWarn) return;
      const message = this._formatMessage("WARN", ...args);
      console.warn(message);
      this._addToHistory("WARN", message);
    }
    error(...args) {
      if (!this.enableError) return;
      const message = this._formatMessage("ERROR", ...args);
      console.error(message);
      this._addToHistory("ERROR", message);
    }
    setLevel(options) {
      this.enableDebug = this.isProd ? false : options.enableDebug !== false;
      this.enableInfo = this.isProd ? false : options.enableInfo !== false;
      this.enableWarn = options.enableWarn !== false;
      this.enableError = options.enableError !== false;
      this.debug("\u65E5\u5FD7\u7EA7\u522B\u5DF2\u66F4\u65B0:", options);
    }
    getHistory(limit = this.logHistory.length) {
      return this.logHistory.slice(-limit);
    }
    clearHistory() {
      this.logHistory = [];
      this.debug("\u65E5\u5FD7\u5386\u53F2\u5DF2\u6E05\u7A7A");
    }
    exportLogs() {
      return this.logHistory.map((log) => `[${new Date(log.timestamp).toISOString()}] [${log.level}] ${log.message}`).join("\n");
    }
    captureError(error, context = "") {
      const errorMessage = `${context}${context ? ": " : ""}${error.message || "Unknown error"}`;
      const stack = error.stack || "";
      this.error(errorMessage, "Stack:", stack);
      return errorMessage;
    }
  };
  var defaultLogger = new Logger();
  var logger_default = defaultLogger;

  // src/utils/storage.ts
  function getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === "object" && parsed._expiresAt && Date.now() > parsed._expiresAt) {
        localStorage.removeItem(key);
        return defaultValue;
      }
      return parsed._data !== void 0 ? parsed._data : parsed;
    } catch (error) {
      logger_default.error(`\u83B7\u53D6\u5B58\u50A8\u6570\u636E\u5931\u8D25 (${key}):`, error);
      return defaultValue;
    }
  }
  function setItem(key, value, expiresIn) {
    try {
      let dataToStore;
      if (expiresIn !== void 0) {
        dataToStore = {
          _data: value,
          _expiresAt: Date.now() + expiresIn
        };
      } else {
        dataToStore = value;
      }
      localStorage.setItem(key, JSON.stringify(dataToStore));
      return true;
    } catch (error) {
      logger_default.error(`\u8BBE\u7F6E\u5B58\u50A8\u6570\u636E\u5931\u8D25 (${key}):`, error);
      return false;
    }
  }
  function removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger_default.error(`\u5220\u9664\u5B58\u50A8\u6570\u636E\u5931\u8D25 (${key}):`, error);
      return false;
    }
  }
  function getPrefixedKey(prefix, key) {
    return `${prefix}_${key}`;
  }
  var NamespacedStorage = class {
    constructor(namespace) {
      this.namespace = namespace;
    }
    _getKey(key) {
      return getPrefixedKey(this.namespace, key);
    }
    getItem(key, defaultValue = null) {
      return getItem(this._getKey(key), defaultValue);
    }
    setItem(key, value, expiresIn) {
      return setItem(this._getKey(key), value, expiresIn);
    }
    removeItem(key) {
      return removeItem(this._getKey(key));
    }
    clear() {
      try {
        const prefix = `${this.namespace}_`;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        return true;
      } catch (error) {
        logger_default.error(`\u6E05\u9664\u547D\u540D\u7A7A\u95F4 ${this.namespace} \u5931\u8D25:`, error);
        return false;
      }
    }
  };

  // src/utils/eventEmitter.ts
  var EventEmitter = class {
    constructor() {
      this.events = {};
      this.maxListeners = 10;
    }
    setMaxListeners(n) {
      this.maxListeners = n;
      return this;
    }
    on(event, listener) {
      if (typeof listener !== "function") {
        throw new TypeError("\u76D1\u542C\u5668\u5FC5\u987B\u662F\u51FD\u6570");
      }
      if (!this.events[event]) {
        this.events[event] = [];
      }
      if (this.events[event].length >= this.maxListeners && !this.events[event].includes(listener)) {
        logger_default.warn(`\u8B66\u544A: \u4E8B\u4EF6'${event}'\u7684\u76D1\u542C\u5668\u6570\u91CF\u8D85\u8FC7\u4E86${this.maxListeners}\u4E2A\u3002\u4F7F\u7528setMaxListeners\u65B9\u6CD5\u53EF\u4EE5\u4FEE\u6539\u6B64\u9650\u5236\u3002`);
      }
      this.events[event].push(listener);
      return this;
    }
    once(event, listener) {
      if (typeof listener !== "function") {
        throw new TypeError("\u76D1\u542C\u5668\u5FC5\u987B\u662F\u51FD\u6570");
      }
      const onceWrapper = (...args) => {
        this.off(event, onceWrapper);
        listener.apply(this, args);
      };
      onceWrapper.originalListener = listener;
      return this.on(event, onceWrapper);
    }
    off(event, listener) {
      if (event === void 0) {
        this.events = {};
        return this;
      }
      if (!this.events[event]) {
        return this;
      }
      if (listener === void 0) {
        this.events[event] = [];
        return this;
      }
      this.events[event] = this.events[event].filter((l) => {
        return l !== listener && l.originalListener !== listener;
      });
      return this;
    }
    emit(event, ...args) {
      if (!this.events[event] || this.events[event].length === 0) {
        return false;
      }
      const listeners = [...this.events[event]];
      listeners.forEach((listener) => {
        try {
          listener.apply(this, args);
        } catch (error) {
          logger_default.error(`\u4E8B\u4EF6'${event}'\u7684\u76D1\u542C\u5668\u6267\u884C\u51FA\u9519:`, error);
        }
      });
      return true;
    }
    listeners(event) {
      return this.events[event] || [];
    }
    eventNames() {
      return Object.keys(this.events).filter((event) => this.events[event].length > 0);
    }
    listenerCount(event) {
      return this.events[event] ? this.events[event].length : 0;
    }
    removeAllListeners(event) {
      if (event) {
        this.events[event] = [];
      } else {
        this.events = {};
      }
      return this;
    }
    prependListener(event, listener) {
      if (typeof listener !== "function") {
        throw new TypeError("\u76D1\u542C\u5668\u5FC5\u987B\u662F\u51FD\u6570");
      }
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].unshift(listener);
      return this;
    }
    prependOnceListener(event, listener) {
      if (typeof listener !== "function") {
        throw new TypeError("\u76D1\u542C\u5668\u5FC5\u987B\u662F\u51FD\u6570");
      }
      const onceWrapper = (...args) => {
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
  };
  var defaultEventEmitter = new EventEmitter();
  var eventEmitter_default = defaultEventEmitter;

  // src/utils/performance.ts
  var PerformanceMonitor = class {
    constructor(options = {}) {
      this.enableFpsMonitor = options.enableFpsMonitor !== false;
      this.enableMemoryMonitor = options.enableMemoryMonitor !== false;
      this.sampleInterval = options.sampleInterval || 1e3;
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
    startMonitoring() {
      if (this.isMonitoring) return;
      this.isMonitoring = true;
      if (this.enableFpsMonitor && typeof window.requestAnimationFrame === "function") {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this._startFpsMonitoring();
      }
      if (this.enableMemoryMonitor && performance.memory) {
        this.memoryMonitorId = setInterval(() => {
          this._collectMemoryMetrics();
        }, this.sampleInterval);
      }
    }
    stopMonitoring() {
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
    _startFpsMonitoring() {
      if (!this.isMonitoring) return;
      this.fpsMonitorId = requestAnimationFrame((currentTime) => {
        this.frameCount++;
        const deltaTime = currentTime - this.lastTime;
        if (deltaTime >= 1e3) {
          const fps = Math.round(this.frameCount * 1e3 / deltaTime);
          this._recordFps(fps);
          this.frameCount = 0;
          this.lastTime = currentTime;
        }
        this._startFpsMonitoring();
      });
    }
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
    _collectMemoryMetrics() {
      const memory = performance.memory;
      if (!memory) return;
      const memoryInfo = {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
      this.metrics.memory.push(memoryInfo);
    }
    measureExecutionTime(id, fn) {
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
        logger_default.error(`\u6D4B\u91CF\u6267\u884C\u65F6\u95F4\u51FA\u9519 [${id}]:`, error);
        throw error;
      }
    }
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
    getCurrentFps() {
      if (this.fpsHistory.length === 0) return 0;
      return this.fpsHistory[this.fpsHistory.length - 1];
    }
    getAverageFps(samples = 10) {
      if (this.fpsHistory.length === 0) return 0;
      const recentSamples = this.fpsHistory.slice(-samples);
      const sum = recentSamples.reduce((acc, fps) => acc + fps, 0);
      return Math.round(sum / recentSamples.length);
    }
    getMemoryInfo() {
      const memory = performance.memory;
      if (!memory) return null;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercent: Math.round(memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100)
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
    clearMetrics() {
      this.metrics = {
        fps: [],
        memory: [],
        executionTimes: {},
        renderTimes: []
      };
      this.fpsHistory = [];
    }
    exportReport() {
      return JSON.stringify(this.getMetrics(), null, 2);
    }
    checkPerformanceHealth() {
      const avgFps = this.getAverageFps();
      const memoryInfo = this.getMemoryInfo();
      return {
        isHealthy: avgFps >= 30 && (!memoryInfo || memoryInfo.usedPercent < 80),
        fpsHealthy: avgFps >= 30,
        memoryHealthy: !memoryInfo || memoryInfo.usedPercent < 80,
        currentFps: this.getCurrentFps(),
        averageFps: avgFps,
        memoryUsage: memoryInfo ? `${memoryInfo.usedPercent}%` : "N/A"
      };
    }
    watchPerformance(callback) {
      const checkInterval = setInterval(() => {
        const health = this.checkPerformanceHealth();
        if (!health.isHealthy) {
          callback(health);
        }
      }, 5e3);
      return {
        stop: () => clearInterval(checkInterval)
      };
    }
  };
  var defaultPerformanceMonitor = new PerformanceMonitor();
  var performance_default = defaultPerformanceMonitor;

  // src/config.ts
  var configStorage = new NamespacedStorage("douyin_tool_config");
  var CONFIG_KEY = "main";
  var CONFIG_VERSION = "2.0.3";
  var DEFAULT_CONFIG = {
    version: CONFIG_VERSION,
    theme: "light",
    videoUI: {
      showLikeButton: true,
      showCommentButton: true,
      showShareButton: true,
      showAuthorInfo: true,
      showMusicInfo: true,
      showDescription: true,
      showRecommendations: true,
      layout: "default",
      controlBar: {
        show: true,
        autoHide: true,
        position: "bottom",
        size: "medium",
        opacity: 0.9
      },
      playback: {
        defaultQuality: "auto",
        autoPlay: true,
        loop: false
      }
    },
    liveUI: {
      showGifts: true,
      showDanmaku: true,
      showRecommendations: true,
      showAds: false,
      showStats: true,
      danmaku: {
        fontSize: 16,
        color: "#FFFFFF",
        opacity: 0.8,
        speed: "medium",
        position: "top",
        maxLines: 5
      },
      layout: "default",
      volume: 100
    },
    general: {
      autoPlay: true,
      autoScroll: false,
      keyboardShortcuts: true,
      notifications: false,
      language: "zh-CN",
      animations: true,
      updateCheck: true
    },
    advanced: {
      debugMode: false,
      performanceMode: false,
      customCSS: "",
      customScripts: []
    }
  };
  var currentConfig = null;
  function loadConfig() {
    try {
      const savedConfig = configStorage.getItem(CONFIG_KEY);
      if (savedConfig) {
        logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u52A0\u8F7D\u5DF2\u4FDD\u5B58\u7684\u914D\u7F6E");
        const loadedConfig = migrateConfig(savedConfig);
        currentConfig = mergeConfig(loadedConfig, DEFAULT_CONFIG);
        currentConfig.version = CONFIG_VERSION;
      } else {
        logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u4F7F\u7528\u9ED8\u8BA4\u914D\u7F6E");
        currentConfig = { ...DEFAULT_CONFIG };
      }
      saveConfig(currentConfig);
      return currentConfig;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u52A0\u8F7D\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "load", error });
      currentConfig = { ...DEFAULT_CONFIG };
      return currentConfig;
    }
  }
  function getConfig() {
    if (!currentConfig) {
      loadConfig();
    }
    return { ...currentConfig };
  }
  function setConfig(key, value) {
    try {
      if (!currentConfig) {
        loadConfig();
      }
      if (typeof key === "object") {
        currentConfig = mergeConfig(key, currentConfig);
      } else {
        if (key.includes(".")) {
          setNestedConfig(key, value);
        } else {
          currentConfig[key] = value;
        }
      }
      currentConfig.version = CONFIG_VERSION;
      saveConfig(currentConfig);
      return true;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u8BBE\u7F6E\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "set", error, key, value });
      return false;
    }
  }
  function setNestedConfig(path, value) {
    const keys = path.split(".");
    let obj = currentConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!obj[key] || typeof obj[key] !== "object") {
        obj[key] = {};
      }
      obj = obj[key];
    }
    obj[keys[keys.length - 1]] = value;
  }
  function getConfigValue(path, defaultValue) {
    if (!currentConfig) {
      loadConfig();
    }
    if (path.includes(".")) {
      return getNestedItemFromConfig(path, defaultValue);
    }
    const value = currentConfig[path];
    return value !== void 0 ? value : defaultValue;
  }
  function getNestedItemFromConfig(path, defaultValue) {
    const keys = path.split(".");
    let obj = currentConfig;
    for (const key of keys) {
      if (obj === null || obj === void 0 || typeof obj !== "object" || !(key in obj)) {
        return defaultValue;
      }
      obj = obj[key];
    }
    return obj;
  }
  function saveConfig(config) {
    try {
      configStorage.setItem(CONFIG_KEY, config);
      logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u5DF2\u4FDD\u5B58");
      eventEmitter_default.emit("config.saved", { config });
      return true;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u4FDD\u5B58\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "save", error });
      return false;
    }
  }
  function resetConfig() {
    try {
      currentConfig = { ...DEFAULT_CONFIG };
      configStorage.setItem(CONFIG_KEY, currentConfig);
      logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u503C");
      eventEmitter_default.emit("config.reset", { config: currentConfig });
      return currentConfig;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u91CD\u7F6E\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "reset", error });
      return { ...DEFAULT_CONFIG };
    }
  }
  function mergeConfig(userConfig, defaultConfig) {
    const merged = { ...defaultConfig };
    for (const key in userConfig) {
      if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
        const userValue = userConfig[key];
        const defaultVal = defaultConfig[key];
        if (typeof userValue === "object" && userValue !== null && typeof defaultVal === "object" && defaultVal !== null && !Array.isArray(userValue) && !Array.isArray(defaultVal)) {
          merged[key] = mergeConfig(
            userValue,
            defaultVal
          );
        } else {
          merged[key] = userValue;
        }
      }
    }
    return merged;
  }
  function migrateConfig(oldConfig) {
    if (!oldConfig.version || oldConfig.version !== CONFIG_VERSION) {
      logger_default.info(`[\u6296\u97F3\u5DE5\u5177] \u6267\u884C\u914D\u7F6E\u8FC1\u79FB: ${oldConfig.version || "unknown"} -> ${CONFIG_VERSION}`);
      eventEmitter_default.emit("config.migrating", {
        fromVersion: oldConfig.version || "unknown",
        toVersion: CONFIG_VERSION
      });
      if (!oldConfig.advanced) {
        oldConfig.advanced = DEFAULT_CONFIG.advanced;
      }
      if (!oldConfig.videoUI.playback) {
        oldConfig.videoUI.playback = DEFAULT_CONFIG.videoUI.playback;
      }
      if (!oldConfig.liveUI.danmaku.maxLines) {
        oldConfig.liveUI.danmaku.maxLines = DEFAULT_CONFIG.liveUI.danmaku.maxLines;
      }
    }
    return oldConfig;
  }
  function exportConfig() {
    const config = getConfig();
    try {
      const result = JSON.stringify(config, null, 2);
      logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u5BFC\u51FA\u6210\u529F");
      return result;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u5BFC\u51FA\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "export", error });
      return "{}";
    }
  }
  function safeJsonParse(input) {
    const parsed = JSON.parse(input);
    const seen = /* @__PURE__ */ new WeakSet();
    const sanitize = (value) => {
      if (value === null || typeof value !== "object") {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(sanitize);
      }
      if (seen.has(value)) {
        return void 0;
      }
      seen.add(value);
      const result = {};
      for (const key of Object.keys(value)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          continue;
        }
        result[key] = sanitize(value[key]);
      }
      return result;
    };
    return sanitize(parsed);
  }
  function importConfig(jsonString) {
    try {
      const config = safeJsonParse(jsonString);
      if (typeof config !== "object" || config === null || Array.isArray(config)) {
        throw new Error("\u914D\u7F6E\u683C\u5F0F\u65E0\u6548");
      }
      currentConfig = mergeConfig(config, DEFAULT_CONFIG);
      currentConfig.version = CONFIG_VERSION;
      saveConfig(currentConfig);
      logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u5BFC\u5165\u6210\u529F");
      eventEmitter_default.emit("config.imported", { config: currentConfig });
      return true;
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u5BFC\u5165\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "import", error });
      return false;
    }
  }
  function validateConfig(config) {
    const issues = [];
    try {
      if (config.theme && !["light", "dark"].includes(config.theme)) {
        issues.push("\u4E3B\u9898\u914D\u7F6E\u65E0\u6548\uFF0C\u5E94\u4E3A light \u6216 dark");
      }
      if (config.videoUI?.layout && !["default", "compact", "fullscreen"].includes(config.videoUI.layout)) {
        issues.push("\u89C6\u9891\u754C\u9762\u5E03\u5C40\u914D\u7F6E\u65E0\u6548");
      }
      if (config.liveUI?.layout && !["default", "minimal", "immersive"].includes(config.liveUI.layout)) {
        issues.push("\u76F4\u64AD\u95F4\u754C\u9762\u5E03\u5C40\u914D\u7F6E\u65E0\u6548");
      }
      if (config.liveUI?.danmaku?.fontSize && (config.liveUI.danmaku.fontSize < 12 || config.liveUI.danmaku.fontSize > 36)) {
        issues.push("\u5F39\u5E55\u5B57\u4F53\u5927\u5C0F\u5E94\u5728 12-36 \u4E4B\u95F4");
      }
      if (config.liveUI?.danmaku?.opacity && (config.liveUI.danmaku.opacity < 0.1 || config.liveUI.danmaku.opacity > 1)) {
        issues.push("\u5F39\u5E55\u900F\u660E\u5EA6\u5E94\u5728 0.1-1 \u4E4B\u95F4");
      }
    } catch (error) {
      logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u9A8C\u8BC1\u914D\u7F6E\u5931\u8D25\uFF1A", error);
      eventEmitter_default.emit("config.error", { type: "validate", error });
      issues.push("\u914D\u7F6E\u9A8C\u8BC1\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF");
    }
    return {
      valid: issues.length === 0,
      issues
    };
  }
  var initialized = loadConfig();
  eventEmitter_default.on("config.saved", (data) => {
    logger_default.debug("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u5DF2\u4FDD\u5B58:", data);
  });
  eventEmitter_default.on("config.error", (data) => {
    logger_default.error("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u9519\u8BEF:", data);
  });
  var config_default = {
    loadConfig,
    getConfig,
    setConfig,
    getConfigValue,
    saveConfig,
    resetConfig,
    exportConfig,
    importConfig,
    validateConfig,
    get DEFAULT_CONFIG() {
      return { ...DEFAULT_CONFIG };
    },
    get CONFIG_VERSION() {
      return CONFIG_VERSION;
    },
    get initialized() {
      return initialized !== null;
    }
  };
  logger_default.info("[\u6296\u97F3\u5DE5\u5177] \u914D\u7F6E\u7BA1\u7406\u5668\u5DF2\u521D\u59CB\u5316");
  eventEmitter_default.emit("config.initialized", { config: currentConfig });

  // src/types/index.ts
  function isDOMCacheEntry(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const entry = value;
    if (typeof entry.timestamp !== "number") {
      return false;
    }
    if (entry.element !== void 0 && entry.element !== null && !(entry.element instanceof Element)) {
      return false;
    }
    if (entry.elements !== void 0) {
      if (!Array.isArray(entry.elements)) {
        return false;
      }
      for (const elem of entry.elements) {
        if (!(elem instanceof HTMLElement)) {
          return false;
        }
      }
    }
    return true;
  }

  // src/utils/dom.ts
  var domCache = /* @__PURE__ */ new Map();
  var cacheExpiry = 5e3;
  var isDevMode = (() => {
    try {
      if (typeof window !== "undefined" && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("douyin_tool_debug") === "true") {
          return true;
        }
      }
      const debugStorage = new NamespacedStorage("douyin_ui_customizer_debug");
      return debugStorage.getItem("mode") === "true";
    } catch {
      return false;
    }
  })();
  function isValidCacheEntry(entry) {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const e = entry;
    return typeof e.timestamp === "number";
  }
  var validateCacheEntry = isDevMode ? isDOMCacheEntry : isValidCacheEntry;
  function generateCacheKey(selector, parent = document) {
    const selectorStr = typeof selector === "string" ? selector : selector.toString();
    let parentStr = "document";
    if (parent !== document && "id" in parent) {
      parentStr = parent.id || parent.className || parent.tagName;
    }
    return `${selectorStr}_${parentStr}`;
  }
  function cleanupCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of domCache.entries()) {
      if (now - timestamp > cacheExpiry) {
        domCache.delete(key);
      }
    }
  }
  var cleanupInterval = setInterval(cleanupCache, cacheExpiry * 2);
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  function throttle(func, limit) {
    let inThrottle = false;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
  function getElement(selector, parent = document) {
    try {
      const cacheKey = generateCacheKey(selector, parent);
      if (domCache.has(cacheKey)) {
        const entry = domCache.get(cacheKey);
        if (!validateCacheEntry(entry)) {
          if (isDevMode) {
            logger_default.warn("\u7F13\u5B58\u6761\u76EE\u7C7B\u578B\u9A8C\u8BC1\u5931\u8D25\uFF0C\u5DF2\u6E05\u9664");
          }
          domCache.delete(cacheKey);
        } else {
          return entry.element;
        }
      }
      const element = parent.querySelector(selector);
      domCache.set(cacheKey, {
        element,
        timestamp: Date.now()
      });
      return element;
    } catch (error) {
      logger_default.error(`\u83B7\u53D6\u5143\u7D20\u5931\u8D25 (${selector}):`, error);
      return null;
    }
  }
  function getElements(selector, parent = document) {
    try {
      const cacheKey = generateCacheKey(selector, parent);
      if (domCache.has(cacheKey)) {
        const entry = domCache.get(cacheKey);
        if (!validateCacheEntry(entry)) {
          if (isDevMode) {
            logger_default.warn("\u7F13\u5B58\u6761\u76EE\u7C7B\u578B\u9A8C\u8BC1\u5931\u8D25\uFF0C\u5DF2\u6E05\u9664");
          }
          domCache.delete(cacheKey);
        } else {
          return entry.elements || [];
        }
      }
      const elements = Array.from(parent.querySelectorAll(selector));
      domCache.set(cacheKey, {
        elements,
        timestamp: Date.now()
      });
      return elements;
    } catch (error) {
      logger_default.error(`\u83B7\u53D6\u591A\u4E2A\u5143\u7D20\u5931\u8D25 (${selector}):`, error);
      return [];
    }
  }
  function findElementsByClassPattern(pattern, parent = document) {
    try {
      const cacheKey = generateCacheKey(pattern, parent);
      if (domCache.has(cacheKey)) {
        const entry = domCache.get(cacheKey);
        if (!validateCacheEntry(entry)) {
          if (isDevMode) {
            logger_default.warn("\u7F13\u5B58\u6761\u76EE\u7C7B\u578B\u9A8C\u8BC1\u5931\u8D25\uFF0C\u5DF2\u6E05\u9664");
          }
          domCache.delete(cacheKey);
        } else {
          return entry.elements || [];
        }
      }
      const elements = [];
      const patternStr = pattern.toString().replace(/^\/|\/$/g, "");
      if (!patternStr.includes("|") && !patternStr.includes("*") && !patternStr.includes("+") && !patternStr.includes("?")) {
        try {
          const selector = `.${patternStr}`;
          const cssElements = getElements(selector, parent);
          if (cssElements.length > 0) {
            domCache.set(cacheKey, {
              elements: cssElements,
              timestamp: Date.now()
            });
            return cssElements;
          }
        } catch {
        }
      }
      const allElements = parent.querySelectorAll("[class]");
      allElements.forEach((element) => {
        if (pattern.test(element.className)) {
          elements.push(element);
        }
      });
      domCache.set(cacheKey, {
        elements,
        timestamp: Date.now()
      });
      return elements;
    } catch (error) {
      logger_default.error("\u901A\u8FC7\u7C7B\u540D\u6A21\u5F0F\u67E5\u627E\u5143\u7D20\u5931\u8D25:", error);
      return [];
    }
  }
  function findElementsByStructure(options, parent = document) {
    try {
      const cacheKey = generateCacheKey(JSON.stringify(options), parent);
      if (domCache.has(cacheKey)) {
        const entry = domCache.get(cacheKey);
        if (!validateCacheEntry(entry)) {
          if (isDevMode) {
            logger_default.warn("\u7F13\u5B58\u6761\u76EE\u7C7B\u578B\u9A8C\u8BC1\u5931\u8D25\uFF0C\u5DF2\u6E05\u9664");
          }
          domCache.delete(cacheKey);
        } else {
          return entry.elements || [];
        }
      }
      const result = [];
      const candidates = options.tagName ? parent.getElementsByTagName(options.tagName) : parent.getElementsByTagName("*");
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        let match = true;
        if (options.attributes) {
          for (const [attr, value] of Object.entries(options.attributes)) {
            if (candidate.getAttribute(attr) !== value) {
              match = false;
              break;
            }
          }
        }
        if (match && options.children) {
          match = options.children.every((childOption, index) => {
            const child = candidate.children[index];
            if (!child) return false;
            if (childOption.tagName && child.tagName.toLowerCase() !== childOption.tagName.toLowerCase()) {
              return false;
            }
            if (childOption.attributes) {
              for (const [attr, value] of Object.entries(childOption.attributes)) {
                if (child.getAttribute(attr) !== value) {
                  return false;
                }
              }
            }
            return true;
          });
        }
        if (match) {
          result.push(candidate);
        }
      }
      domCache.set(cacheKey, {
        elements: result,
        timestamp: Date.now()
      });
      return result;
    } catch (error) {
      logger_default.error("\u901A\u8FC7\u7ED3\u6784\u67E5\u627E\u5143\u7D20\u5931\u8D25:", error);
      return [];
    }
  }
  function toggleElements(elements, show) {
    try {
      const elementArray = Array.isArray(elements) ? elements : [elements];
      elementArray.forEach((element) => {
        if (element && element.style) {
          element.style.display = show ? "" : "none";
        }
      });
    } catch (error) {
      logger_default.error("\u5207\u6362\u5143\u7D20\u663E\u793A\u72B6\u6001\u5931\u8D25:", error);
    }
  }
  function addEvent(element, eventType, handler, options) {
    try {
      if (element && "addEventListener" in element) {
        element.addEventListener(eventType, handler, options);
      }
    } catch (error) {
      logger_default.error(`\u6DFB\u52A0\u4E8B\u4EF6\u76D1\u542C\u5668\u5931\u8D25 (${eventType}):`, error);
    }
  }
  function removeEvent(element, eventType, handler, options) {
    try {
      if (element && "removeEventListener" in element) {
        element.removeEventListener(eventType, handler, options);
      }
    } catch (error) {
      logger_default.error(`\u79FB\u9664\u4E8B\u4EF6\u76D1\u542C\u5668\u5931\u8D25 (${eventType}):`, error);
    }
  }
  function createElement(tagName, attributes = {}, children = []) {
    try {
      const element = document.createElement(tagName);
      for (const [key, value] of Object.entries(attributes)) {
        if (key === "style" && typeof value === "object" && value !== null) {
          Object.assign(element.style, value);
        } else if (key === "className" && typeof value === "string") {
          element.className = value;
        } else if (typeof value === "string") {
          element.setAttribute(key, value);
        }
      }
      children.forEach((child) => {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else if (child && child.nodeType) {
          element.appendChild(child);
        }
      });
      return element;
    } catch (error) {
      logger_default.error(`\u521B\u5EFA\u5143\u7D20\u5931\u8D25 (${tagName}):`, error);
      return document.createElement(tagName);
    }
  }
  function injectStyle(css) {
    try {
      const styleElement = document.createElement("style");
      styleElement.type = "text/css";
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
      return styleElement;
    } catch (error) {
      logger_default.error("\u6CE8\u5165\u6837\u5F0F\u5931\u8D25:", error);
      return null;
    }
  }
  function escapeHtml(input) {
    return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // src/styles/theme.ts
  var DEFAULT_THEMES = {
    light: {
      name: "light",
      label: "\u6D45\u8272\u6A21\u5F0F",
      variables: {
        "--bg-primary": "#ffffff",
        "--bg-secondary": "#f8f9fa",
        "--bg-tertiary": "#e9ecef",
        "--text-primary": "#212529",
        "--text-secondary": "#6c757d",
        "--text-tertiary": "#adb5bd",
        "--border-color": "#dee2e6",
        "--accent-color": "#007bff",
        "--accent-hover": "#0056b3",
        "--danger-color": "#dc3545",
        "--success-color": "#28a745",
        "--warning-color": "#ffc107",
        "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "--border-radius": "8px",
        "--transition-speed": "0.2s",
        "--opacity-hover": "0.8",
        "--opacity-active": "0.6"
      }
    },
    dark: {
      name: "dark",
      label: "\u6DF1\u8272\u6A21\u5F0F",
      variables: {
        "--bg-primary": "#121212",
        "--bg-secondary": "#1e1e1e",
        "--bg-tertiary": "#2d2d2d",
        "--text-primary": "#ffffff",
        "--text-secondary": "#b0b0b0",
        "--text-tertiary": "#6c6c6c",
        "--border-color": "#3c3c3c",
        "--accent-color": "#1976d2",
        "--accent-hover": "#1565c0",
        "--danger-color": "#f44336",
        "--success-color": "#4caf50",
        "--warning-color": "#ffc107",
        "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
        "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
        "--border-radius": "8px",
        "--transition-speed": "0.2s",
        "--opacity-hover": "0.8",
        "--opacity-active": "0.6"
      }
    },
    minimal: {
      name: "minimal",
      label: "\u6781\u7B80\u6A21\u5F0F",
      variables: {
        "--bg-primary": "#ffffff",
        "--bg-secondary": "#fafafa",
        "--bg-tertiary": "#f5f5f5",
        "--text-primary": "#1a1a1a",
        "--text-secondary": "#666666",
        "--text-tertiary": "#999999",
        "--border-color": "#eeeeee",
        "--accent-color": "#333333",
        "--accent-hover": "#000000",
        "--danger-color": "#ff3b30",
        "--success-color": "#34c759",
        "--warning-color": "#ffcc00",
        "--shadow-sm": "none",
        "--shadow-md": "0 1px 3px rgba(0, 0, 0, 0.1)",
        "--shadow-lg": "0 4px 6px rgba(0, 0, 0, 0.1)",
        "--border-radius": "4px",
        "--transition-speed": "0.2s",
        "--opacity-hover": "0.9",
        "--opacity-active": "0.8"
      }
    }
  };
  var ThemeManager = class {
    constructor() {
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = null;
      this.styleElement = null;
      this.storage = new NamespacedStorage("douyin_ui_customizer_theme");
    }
    init() {
      try {
        const savedTheme = this.storage.getItem("current");
        if (savedTheme && this.themes[savedTheme]) {
          this.switchTheme(savedTheme);
        } else {
          this.switchTheme("light");
        }
        logger_default.info("\u4E3B\u9898\u7BA1\u7406\u5668\u521D\u59CB\u5316\u6210\u529F");
      } catch (error) {
        logger_default.error("\u4E3B\u9898\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5931\u8D25:", error);
        this.switchTheme("light");
      }
    }
    switchTheme(themeName) {
      try {
        if (!this.themes[themeName]) {
          logger_default.warn(`\u4E3B\u9898 ${themeName} \u4E0D\u5B58\u5728\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u4E3B\u9898`);
          themeName = "light";
        }
        const theme = this.themes[themeName];
        const cssVariables = Object.entries(theme.variables).map(([key, value]) => `${key}: ${value};`).join("\n  ");
        const css = `:root {
  ${cssVariables}
}

.douyin-ui-customizer-theme-${themeName} {}
`;
        if (this.styleElement && this.styleElement.parentNode) {
          this.styleElement.parentNode.removeChild(this.styleElement);
        }
        this.styleElement = injectStyle(css);
        this.currentTheme = themeName;
        this.storage.setItem("current", themeName);
        document.body.classList.remove(
          ...Object.keys(this.themes).map((t) => `douyin-ui-customizer-theme-${t}`)
        );
        document.body.classList.add(`douyin-ui-customizer-theme-${themeName}`);
        logger_default.info(`\u4E3B\u9898\u5207\u6362\u5230 ${theme.label} (${themeName})`);
        return true;
      } catch (error) {
        logger_default.error(`\u4E3B\u9898\u5207\u6362\u5931\u8D25 (${themeName}):`, error);
        return false;
      }
    }
    getCurrentTheme() {
      return this.currentTheme || "light";
    }
    getAvailableThemes() {
      return Object.values(this.themes);
    }
    createTheme(themeConfig) {
      try {
        if (!themeConfig.name || !themeConfig.label) {
          throw new Error("\u4E3B\u9898\u914D\u7F6E\u5FC5\u987B\u5305\u542Bname\u548Clabel\u5C5E\u6027");
        }
        const variables = {};
        if (themeConfig.colors) {
          Object.entries(themeConfig.colors).forEach(([key, value]) => {
            variables[`--${key}`] = value;
          });
        }
        if (themeConfig.fonts) {
          Object.entries(themeConfig.fonts).forEach(([key, value]) => {
            variables[`--font-${key}`] = value;
          });
        }
        const theme = {
          name: themeConfig.name,
          label: themeConfig.label,
          variables
        };
        this.registerTheme(theme);
        logger_default.info(`\u521B\u5EFA\u65B0\u4E3B\u9898\u6210\u529F: ${themeConfig.label}`);
        return themeConfig.name;
      } catch (error) {
        logger_default.error("\u521B\u5EFA\u4E3B\u9898\u5931\u8D25:", error);
        return null;
      }
    }
    deleteTheme(themeName) {
      try {
        if (DEFAULT_THEMES[themeName]) {
          logger_default.warn(`\u4E0D\u80FD\u5220\u9664\u9ED8\u8BA4\u4E3B\u9898: ${themeName}`);
          return false;
        }
        if (!this.themes[themeName]) {
          logger_default.warn(`\u4E3B\u9898\u4E0D\u5B58\u5728: ${themeName}`);
          return false;
        }
        if (this.currentTheme === themeName) {
          this.switchTheme("light");
        }
        delete this.themes[themeName];
        logger_default.info(`\u4E3B\u9898\u5220\u9664\u6210\u529F: ${themeName}`);
        return true;
      } catch (error) {
        logger_default.error(`\u5220\u9664\u4E3B\u9898\u5931\u8D25 (${themeName}):`, error);
        return false;
      }
    }
    getTheme(themeName) {
      return this.themes[themeName] || null;
    }
    registerTheme(theme) {
      try {
        if (!theme.name || !theme.variables) {
          throw new Error("\u4E3B\u9898\u914D\u7F6E\u5FC5\u987B\u5305\u542Bname\u548Cvariables\u5C5E\u6027");
        }
        if (typeof theme.variables !== "object") {
          throw new Error("variables\u5FC5\u987B\u662F\u5BF9\u8C61");
        }
        this.themes[theme.name] = {
          name: theme.name,
          label: theme.label || theme.name,
          variables: { ...theme.variables }
        };
        logger_default.info(`\u65B0\u4E3B\u9898\u6CE8\u518C\u6210\u529F: ${theme.label || theme.name}`);
        return true;
      } catch (error) {
        logger_default.error("\u4E3B\u9898\u6CE8\u518C\u5931\u8D25:", error);
        return false;
      }
    }
    exportTheme(themeName) {
      try {
        const theme = this.themes[themeName];
        if (!theme) return null;
        return JSON.stringify(theme, null, 2);
      } catch (error) {
        logger_default.error(`\u4E3B\u9898\u5BFC\u51FA\u5931\u8D25 (${themeName}):`, error);
        return null;
      }
    }
    importTheme(themeJson) {
      try {
        const theme = JSON.parse(themeJson);
        return this.registerTheme(theme);
      } catch (error) {
        logger_default.error("\u4E3B\u9898\u5BFC\u5165\u5931\u8D25:", error);
        return false;
      }
    }
    generatePreviewStyle(themeName) {
      const theme = this.themes[themeName];
      if (!theme) return null;
      return Object.entries(theme.variables).map(([key, value]) => `${key}: ${value}`).join("; ");
    }
    applyThemeToElement(element, themeName) {
      try {
        const theme = this.themes[themeName];
        if (!theme || !element) return;
        Object.entries(theme.variables).forEach(([key, value]) => {
          element.style.setProperty(key, value);
        });
        element.classList.remove(
          ...Object.keys(this.themes).map((t) => `douyin-ui-customizer-theme-${t}`)
        );
        element.classList.add(`douyin-ui-customizer-theme-${themeName}`);
      } catch (error) {
        logger_default.error(`\u5E94\u7528\u4E3B\u9898\u5230\u5143\u7D20\u5931\u8D25:`, error);
      }
    }
    reset() {
      try {
        if (this.styleElement && this.styleElement.parentNode) {
          this.styleElement.parentNode.removeChild(this.styleElement);
        }
        Object.keys(this.themes).forEach((themeName) => {
          document.body.classList.remove(`douyin-ui-customizer-theme-${themeName}`);
        });
        this.themes = { ...DEFAULT_THEMES };
        this.currentTheme = null;
        this.styleElement = null;
        this.storage.removeItem("current");
        this.init();
        logger_default.info("\u4E3B\u9898\u8BBE\u7F6E\u5DF2\u91CD\u7F6E");
      } catch (error) {
        logger_default.error("\u91CD\u7F6E\u4E3B\u9898\u8BBE\u7F6E\u5931\u8D25:", error);
      }
    }
    on(event, callback) {
      if (event === "themeChanged") {
        const originalSwitchTheme = this.switchTheme.bind(this);
        this.switchTheme = (themeName) => {
          const result = originalSwitchTheme(themeName);
          if (result) {
            callback(themeName);
          }
          return result;
        };
      }
    }
    applyTheme(themeName) {
      return Promise.resolve(this.switchTheme(themeName));
    }
    listThemes() {
      return this.getAvailableThemes();
    }
  };
  var themeManager = new ThemeManager();
  var theme_default = themeManager;

  // src/utils/buttonDetector.ts
  var ButtonDetector = class {
    constructor(options = {}) {
      this.options = {
        buttonTexts: ["Continue", "Run", "Execute", "Next", "Proceed", "Start", "\u7EE7\u7EED", "\u8FD0\u884C", "\u6267\u884C", "\u4E0B\u4E00\u6B65", "\u5F00\u59CB"],
        cssSelectors: [
          "button:contains(Continue)",
          "button:contains(Run)",
          "button:contains(Execute)",
          "button:contains(Next)",
          "button:contains(Proceed)",
          "button:contains(Start)",
          "button:contains(\u7EE7\u7EED)",
          "button:contains(\u8FD0\u884C)",
          "button:contains(\u6267\u884C)",
          "button:contains(\u4E0B\u4E00\u6B65)",
          "button:contains(\u5F00\u59CB)",
          ".button-primary",
          ".btn-primary",
          '[type="submit"]',
          ".continue-button",
          ".run-button",
          ".execute-button"
        ],
        enableLogging: true,
        ...options
      };
    }
    detect(options = {}) {
      const detectionStrategies = options.detectionStrategies || ["text", "css", "structure"];
      let button = null;
      for (const strategy of detectionStrategies) {
        switch (strategy) {
          case "text":
            button = this.detectByText();
            break;
          case "css":
            button = this.detectByCSS();
            break;
          case "structure":
            button = this.detectByStructure();
            break;
          case "xpath":
            button = this.detectByXPath();
            break;
          case "accessibility":
            button = this.detectByAccessibility();
            break;
          default:
            if (this.options.enableLogging) {
              logger_default.warn(`ButtonDetector unknown detection strategy: ${strategy}`);
            }
        }
        if (button) {
          if (this.options.enableLogging) {
            logger_default.info(`ButtonDetector detected button using ${strategy} strategy`);
          }
          break;
        }
      }
      return button;
    }
    detectByText() {
      const allElements = document.getElementsByTagName("*");
      for (const element of allElements) {
        const text = element.textContent || "";
        const trimmedText = text.trim();
        if (this.options.buttonTexts?.includes(trimmedText)) {
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
      for (const selector of this.options.cssSelectors || []) {
        if (selector.includes(":contains")) {
          const textMatch = selector.match(/:contains\(([^)]+)\)/);
          if (textMatch && textMatch[1]) {
            const text = textMatch[1].replace(/['"]/g, "");
            const baseSelector = selector.replace(/:contains\([^)]+\)/, "");
            const elements = getElements(baseSelector || "*");
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
        { tagName: "button" },
        { tagName: "input", attributes: { type: "button" } },
        { tagName: "input", attributes: { type: "submit" } },
        { tagName: "div", attributes: { role: "button" } },
        { tagName: "span", attributes: { role: "button" } }
      ];
      for (const structure of buttonStructures) {
        const elements = findElementsByStructure(structure);
        for (const element of elements) {
          const text = element.textContent || "";
          const trimmedText = text.trim();
          if (this.options.buttonTexts?.includes(trimmedText)) {
            return element;
          }
        }
      }
      return null;
    }
    detectByXPath() {
      try {
        for (const text of this.options.buttonTexts || []) {
          const xpath = `//*[text()='${text}' or contains(text(),'${text}')]`;
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const element = result.singleNodeValue;
          if (element) {
            return element;
          }
        }
      } catch (error) {
        if (this.options.enableLogging) {
          logger_default.error("ButtonDetector XPath detection failed:", error);
        }
      }
      return null;
    }
    detectByAccessibility() {
      const accessibilityAttributes = ["aria-label", "aria-labelledby", "title", "alt"];
      const allElements = document.getElementsByTagName("*");
      for (const element of allElements) {
        for (const attr of accessibilityAttributes) {
          const value = element.getAttribute(attr);
          if (value) {
            for (const text of this.options.buttonTexts || []) {
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
      const clickableTags = ["button", "input", "a", "div", "span"];
      const clickableRoles = ["button", "link", "submit"];
      if (clickableTags.includes(element.tagName.toLowerCase())) {
        const role = element.getAttribute("role");
        if (!role || clickableRoles.includes(role)) {
          return true;
        }
      }
      return false;
    }
  };
  var buttonDetector_default = new ButtonDetector();

  // src/utils/autoExecutor.ts
  var AutoExecutor = class {
    constructor(options = {}) {
      this.options = {
        detectionStrategies: ["text", "css", "structure"],
        retryConfig: {
          maxAttempts: 10,
          initialDelay: 500,
          backoffFactor: 2
        },
        checkInterval: 1e3,
        enabled: false,
        customDetector: () => null,
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
        logger_default.info("AutoExecutor initialized with options:", this.options);
      }
      eventEmitter_default.on("autoExecutor.emergencyStop", () => {
        this.emergencyStop();
      });
    }
    start() {
      if (this.isRunning) {
        if (this.options.enableLogging) {
          logger_default.warn("AutoExecutor is already running");
        }
        return;
      }
      if (this.options.confirmationRequired) {
        const confirmed = confirm("\u786E\u8BA4\u8981\u542F\u52A8\u81EA\u52A8\u6267\u884C\u63A7\u5236\u5668\u5417\uFF1F\u8FD9\u5C06\u81EA\u52A8\u70B9\u51FB\u754C\u9762\u4E2D\u7684\u6309\u94AE\u3002");
        if (!confirmed) {
          return;
        }
      }
      this.isRunning = true;
      this.isEmergencyStopped = false;
      this.currentAttempt = 0;
      if (this.options.enableLogging) {
        logger_default.info("AutoExecutor started");
      }
      this.isEmergencyStopped = false;
      this.detectAndClick();
      this.checkIntervalId = setInterval(() => {
        this.detectAndClick();
      }, this.options.checkInterval);
      eventEmitter_default.emit("autoExecutor.started");
    }
    stop() {
      if (!this.isRunning) {
        if (this.options.enableLogging) {
          logger_default.warn("AutoExecutor is not running");
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
        logger_default.info("AutoExecutor stopped");
      }
      eventEmitter_default.emit("autoExecutor.stopped");
    }
    emergencyStop() {
      this.isEmergencyStopped = true;
      this.stop();
      if (this.options.enableLogging) {
        logger_default.error("AutoExecutor emergency stopped");
      }
      eventEmitter_default.emit("autoExecutor.emergencyStopped");
    }
    async detectAndClick() {
      if (this.isEmergencyStopped) {
        return;
      }
      try {
        this.currentAttempt++;
        const button = await this.detectButton();
        if (button) {
          if (this.isButtonClickable(button)) {
            if (this.options.captureScreenshots) {
              this.captureScreenshot("before_click");
            }
            this.clickButton(button);
            if (this.options.captureScreenshots) {
              setTimeout(() => {
                this.captureScreenshot("after_click");
              }, 500);
            }
            this.currentAttempt = 0;
          }
        } else if (this.currentAttempt >= this.options.retryConfig.maxAttempts) {
          if (this.options.enableLogging) {
            logger_default.warn(`AutoExecutor failed to detect button after ${this.currentAttempt} attempts`);
          }
          eventEmitter_default.emit("autoExecutor.retryFailed", { attempts: this.currentAttempt });
          this.currentAttempt = 0;
        }
      } catch (error) {
        if (this.options.enableLogging) {
          logger_default.error("AutoExecutor error during detectAndClick:", error);
        }
        eventEmitter_default.emit("autoExecutor.error", { error });
      }
    }
    async detectButton() {
      let button = null;
      if (this.options.customDetector) {
        try {
          button = this.options.customDetector();
          if (button) {
            if (this.options.enableLogging) {
              logger_default.info("AutoExecutor detected button using custom detector");
            }
            return button;
          }
        } catch (error) {
          if (this.options.enableLogging) {
            logger_default.warn("AutoExecutor custom detector failed:", error);
          }
        }
      }
      const detectorOptions = {
        detectionStrategies: this.options.detectionStrategies
      };
      button = buttonDetector_default.detect(detectorOptions);
      return button;
    }
    isButtonClickable(button) {
      if (!button) return false;
      if ("disabled" in button && button.disabled || button.hasAttribute("disabled")) return false;
      if (button.style.display === "none" || button.style.visibility === "hidden") return false;
      const rect = button.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        return false;
      }
      return true;
    }
    compressHistory() {
      if (this.executionHistory.length > this.options.maxHistorySize) {
        this.executionHistory = this.executionHistory.slice(-this.options.maxHistorySize);
        if (this.options.enableLogging) {
          logger_default.info(`AutoExecutor compressed history to ${this.executionHistory.length} records`);
        }
      }
    }
    clickButton(button) {
      if (!button) return;
      try {
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        });
        button.dispatchEvent(clickEvent);
        this.executionHistory.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          buttonText: button.textContent || button.innerText || "Unknown",
          buttonSelector: this.getElementSelector(button),
          success: true
        });
        this.compressHistory();
        if (this.options.enableLogging) {
          logger_default.info(`AutoExecutor clicked button: ${button.textContent || button.innerText}`);
        }
        eventEmitter_default.emit("autoExecutor.buttonClicked", {
          button,
          text: button.textContent || button.innerText,
          selector: this.getElementSelector(button)
        });
      } catch (error) {
        const err = error;
        this.executionHistory.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          buttonText: button.textContent || button.innerText || "Unknown",
          buttonSelector: this.getElementSelector(button),
          success: false,
          error: err.message
        });
        this.compressHistory();
        if (this.options.enableLogging) {
          logger_default.error("AutoExecutor failed to click button:", error);
        }
        eventEmitter_default.emit("autoExecutor.buttonClickFailed", {
          button,
          error
        });
      }
    }
    getElementSelector(element) {
      if (!element) return "";
      try {
        if (element.id) {
          return `#${element.id}`;
        }
        if (element.className && typeof element.className === "string") {
          const classes = element.className.trim().split(/\s+/);
          for (const cls of classes) {
            if (document.querySelectorAll(`.${cls}`).length === 1) {
              return `.${cls}`;
            }
          }
        }
        const path = [];
        let current = element;
        while (current && current.tagName) {
          let selector = current.tagName.toLowerCase();
          if (current.className && typeof current.className === "string") {
            const classes = current.className.trim().split(/\s+/);
            selector += "." + classes.join(".");
          }
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(" > ");
      } catch {
        return element.tagName.toLowerCase();
      }
    }
    captureScreenshot(type) {
      try {
        if (typeof HTMLCanvasElement !== "undefined") {
          logger_default.info(`AutoExecutor capturing screenshot: ${type}`);
        }
      } catch (error) {
        logger_default.error("AutoExecutor failed to capture screenshot:", error);
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
    getExecutionHistory(limit = null) {
      if (limit) {
        return this.executionHistory.slice(-limit);
      }
      return [...this.executionHistory];
    }
    getCurrentAttempt() {
      return this.currentAttempt;
    }
    updateOptions(newOptions) {
      this.options = { ...this.options, ...newOptions };
      if (this.options.enableLogging) {
        logger_default.info("AutoExecutor options updated:", newOptions);
      }
    }
  };
  var autoExecutor_default = new AutoExecutor();

  // src/ui/panels/settingsPanel.ts
  function createSettingsPanelContent(config) {
    return `
    <div class="panel-header">
      <h2>\u6296\u97F3UI\u5B9A\u5236\u8BBE\u7F6E</h2>
      <button class="close-btn" aria-label="\u5173\u95ED\u8BBE\u7F6E\u9762\u677F">\xD7</button>
    </div>
    <div class="panel-content">
      <div class="settings-tabs">
        <div>
          <button class="tab-btn active" data-tab="general" aria-label="\u901A\u7528\u8BBE\u7F6E">\u901A\u7528\u8BBE\u7F6E</button>
          <button class="tab-btn" data-tab="video" aria-label="\u77ED\u89C6\u9891\u8BBE\u7F6E">\u77ED\u89C6\u9891\u8BBE\u7F6E</button>
        </div>
        <div>
          <button class="tab-btn" data-tab="live" aria-label="\u76F4\u64AD\u95F4\u8BBE\u7F6E">\u76F4\u64AD\u95F4\u8BBE\u7F6E</button>
          <button class="tab-btn" data-tab="advanced" aria-label="\u9AD8\u7EA7\u8BBE\u7F6E">\u9AD8\u7EA7\u8BBE\u7F6E</button>
        </div>
        <div>
          <button class="tab-btn" data-tab="auto-executor" aria-label="\u81EA\u52A8\u6267\u884C\u8BBE\u7F6E">\u81EA\u52A8\u6267\u884C</button>
          <button class="tab-btn" data-tab="import-export" aria-label="\u5BFC\u5165\u5BFC\u51FA\u914D\u7F6E">\u5BFC\u5165\u5BFC\u51FA</button>
        </div>
      </div>
      
      <div class="tab-content active" id="general-tab">
        ${createGeneralSettings(config)}
      </div>
      
      <div class="tab-content" id="video-tab">
        ${createVideoSettings(config)}
      </div>
      
      <div class="tab-content" id="live-tab">
        ${createLiveSettings(config)}
      </div>
      
      <div class="tab-content" id="auto-executor-tab">
        ${createAutoExecutorSettings()}
      </div>
      
      <div class="tab-content" id="import-export-tab">
        ${createImportExportSettings()}
      </div>
      
      <div class="tab-content" id="advanced-tab">
        ${createAdvancedSettings(config)}
      </div>
    </div>
    <div class="panel-footer">
      <div>
        <button class="save-btn" aria-label="\u4FDD\u5B58\u5F53\u524D\u8BBE\u7F6E">\u4FDD\u5B58\u8BBE\u7F6E</button>
        <button class="reset-btn" aria-label="\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u8BBE\u7F6E">\u91CD\u7F6E\u4E3A\u9ED8\u8BA4</button>
      </div>
    </div>
  `;
  }
  function createGeneralSettings(config) {
    return `
    <div class="setting-group">
      <h3>\u4E3B\u9898\u8BBE\u7F6E</h3>
      <label>
        <input type="radio" name="theme" value="light" ${config.theme === "light" ? "checked" : ""} />
        \u6D45\u8272\u4E3B\u9898
      </label>
      <label>
        <input type="radio" name="theme" value="dark" ${config.theme === "dark" ? "checked" : ""} />
        \u6DF1\u8272\u4E3B\u9898
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u64AD\u653E\u8BBE\u7F6E</h3>
      <label>
        <input type="checkbox" id="autoPlay" ${config.general?.autoPlay ? "checked" : ""} />
        \u81EA\u52A8\u64AD\u653E\u89C6\u9891
      </label>
      <label>
        <input type="checkbox" id="autoScroll" ${config.general?.autoScroll ? "checked" : ""} />
        \u81EA\u52A8\u6EDA\u52A8\u5230\u4E0B\u4E00\u4E2A\u89C6\u9891
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u529F\u80FD\u8BBE\u7F6E</h3>
      <label>
        <input type="checkbox" id="keyboardShortcuts" ${config.general?.keyboardShortcuts ? "checked" : ""} />
        \u542F\u7528\u952E\u76D8\u5FEB\u6377\u952E
      </label>
      <label>
        <input type="checkbox" id="notifications" ${config.general?.notifications ? "checked" : ""} />
        \u542F\u7528\u901A\u77E5\u63D0\u9192
      </label>
    </div>
  `;
  }
  function createVideoSettings(config) {
    return `
    <div class="setting-group">
      <h3>\u663E\u793A\u5143\u7D20</h3>
      <label>
        <input type="checkbox" id="showLikeButton" ${config.videoUI?.showLikeButton ?? true ? "checked" : ""} />
        \u663E\u793A\u70B9\u8D5E\u6309\u94AE
      </label>
      <label>
        <input type="checkbox" id="showCommentButton" ${config.videoUI?.showCommentButton ?? true ? "checked" : ""} />
        \u663E\u793A\u8BC4\u8BBA\u6309\u94AE
      </label>
      <label>
        <input type="checkbox" id="showShareButton" ${config.videoUI?.showShareButton ?? true ? "checked" : ""} />
        \u663E\u793A\u5206\u4EAB\u6309\u94AE
      </label>
      <label>
        <input type="checkbox" id="showAuthorInfo" ${config.videoUI?.showAuthorInfo ?? true ? "checked" : ""} />
        \u663E\u793A\u4F5C\u8005\u4FE1\u606F
      </label>
      <label>
        <input type="checkbox" id="showMusicInfo" ${config.videoUI?.showMusicInfo ?? true ? "checked" : ""} />
        \u663E\u793A\u97F3\u4E50\u4FE1\u606F
      </label>
      <label>
        <input type="checkbox" id="showDescription" ${config.videoUI?.showDescription ?? true ? "checked" : ""} />
        \u663E\u793A\u89C6\u9891\u63CF\u8FF0
      </label>
      <label>
        <input type="checkbox" id="showRecommendations" ${config.videoUI?.showRecommendations ?? true ? "checked" : ""} />
        \u663E\u793A\u63A8\u8350\u89C6\u9891
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u63A7\u5236\u680F\u8BBE\u7F6E</h3>
      <label>
        <input type="checkbox" id="controlBar-show" ${config.videoUI?.controlBar?.show ?? true ? "checked" : ""} />
        \u663E\u793A\u63A7\u5236\u680F
      </label>
      <label>
        <input type="checkbox" id="controlBar-autoHide" ${config.videoUI?.controlBar?.autoHide ?? true ? "checked" : ""} />
        \u81EA\u52A8\u9690\u85CF\u63A7\u5236\u680F
      </label>
      <label>
        <select id="controlBar-position">
          <option value="bottom" ${config.videoUI?.controlBar?.position === "bottom" ? "selected" : ""}>\u5E95\u90E8</option>
          <option value="top" ${config.videoUI?.controlBar?.position === "top" ? "selected" : ""}>\u9876\u90E8</option>
        </select>
        \u63A7\u5236\u680F\u4F4D\u7F6E
      </label>
      <label>
        <select id="controlBar-size">
          <option value="small" ${config.videoUI?.controlBar?.size === "small" ? "selected" : ""}>\u5C0F</option>
          <option value="medium" ${config.videoUI?.controlBar?.size === "medium" ? "selected" : ""}>\u4E2D</option>
          <option value="large" ${config.videoUI?.controlBar?.size === "large" ? "selected" : ""}>\u5927</option>
        </select>
        \u63A7\u5236\u680F\u5927\u5C0F
      </label>
      <label>
        <input type="range" id="controlBar-opacity" min="0.1" max="1" step="0.1" value="${config.videoUI?.controlBar?.opacity ?? 0.9}" />
        \u63A7\u5236\u680F\u900F\u660E\u5EA6: <span id="controlBar-opacity-value">${(config.videoUI?.controlBar?.opacity ?? 0.9) * 100}%</span>
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u64AD\u653E\u8BBE\u7F6E</h3>
      <label>
        <select id="playback-defaultQuality">
          <option value="auto" ${config.videoUI?.playback?.defaultQuality === "auto" ? "selected" : ""}>\u81EA\u52A8</option>
          <option value="low" ${config.videoUI?.playback?.defaultQuality === "low" ? "selected" : ""}>\u4F4E\u753B\u8D28</option>
          <option value="medium" ${config.videoUI?.playback?.defaultQuality === "medium" ? "selected" : ""}>\u4E2D\u753B\u8D28</option>
          <option value="high" ${config.videoUI?.playback?.defaultQuality === "high" ? "selected" : ""}>\u9AD8\u753B\u8D28</option>
          <option value="ultra" ${config.videoUI?.playback?.defaultQuality === "ultra" ? "selected" : ""}>\u8D85\u6E05</option>
        </select>
        \u9ED8\u8BA4\u753B\u8D28
      </label>
      <label>
        <input type="checkbox" id="playback-autoPlay" ${config.videoUI?.playback?.autoPlay ?? true ? "checked" : ""} />
        \u81EA\u52A8\u64AD\u653E
      </label>
      <label>
        <input type="checkbox" id="playback-loop" ${config.videoUI?.playback?.loop ?? false ? "checked" : ""} />
        \u5FAA\u73AF\u64AD\u653E
      </label>
    </div>
  `;
  }
  function createLiveSettings(config) {
    return `
    <div class="setting-group">
      <h3>\u663E\u793A\u5143\u7D20</h3>
      <label>
        <input type="checkbox" id="liveShowGifts" ${config.liveUI?.showGifts ?? true ? "checked" : ""} />
        \u663E\u793A\u793C\u7269
      </label>
      <label>
        <input type="checkbox" id="liveShowDanmaku" ${config.liveUI?.showDanmaku ?? true ? "checked" : ""} />
        \u663E\u793A\u5F39\u5E55
      </label>
      <label>
        <input type="checkbox" id="liveShowRecommendations" ${config.liveUI?.showRecommendations ?? true ? "checked" : ""} />
        \u663E\u793A\u63A8\u8350
      </label>
      <label>
        <input type="checkbox" id="liveShowAds" ${config.liveUI?.showAds ?? false ? "checked" : ""} />
        \u663E\u793A\u5E7F\u544A
      </label>
      <label>
        <input type="checkbox" id="liveShowStats" ${config.liveUI?.showStats ?? true ? "checked" : ""} />
        \u663E\u793A\u7EDF\u8BA1\u4FE1\u606F
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u5F39\u5E55\u8BBE\u7F6E</h3>
      <label>
        <input type="range" id="danmaku-fontSize" min="12" max="36" step="1" value="${config.liveUI?.danmaku?.fontSize ?? 16}" />
        \u5F39\u5E55\u5B57\u4F53\u5927\u5C0F: <span id="danmaku-fontSize-value">${config.liveUI?.danmaku?.fontSize ?? 16}px</span>
      </label>
      <label>
        <input type="color" id="danmaku-color" value="${config.liveUI?.danmaku?.color ?? "#FFFFFF"}" />
        \u5F39\u5E55\u989C\u8272
      </label>
      <label>
        <input type="range" id="danmaku-opacity" min="0.1" max="1" step="0.1" value="${config.liveUI?.danmaku?.opacity ?? 0.8}" />
        \u5F39\u5E55\u900F\u660E\u5EA6: <span id="danmaku-opacity-value">${(config.liveUI?.danmaku?.opacity ?? 0.8) * 100}%</span>
      </label>
      <label>
        <select id="danmaku-speed">
          <option value="fast" ${config.liveUI?.danmaku?.speed === "fast" ? "selected" : ""}>\u5FEB</option>
          <option value="medium" ${config.liveUI?.danmaku?.speed === "medium" ? "selected" : ""}>\u4E2D</option>
          <option value="slow" ${config.liveUI?.danmaku?.speed === "slow" ? "selected" : ""}>\u6162</option>
        </select>
        \u5F39\u5E55\u901F\u5EA6
      </label>
      <label>
        <select id="danmaku-position">
          <option value="top" ${config.liveUI?.danmaku?.position === "top" ? "selected" : ""}>\u9876\u90E8</option>
          <option value="middle" ${config.liveUI?.danmaku?.position === "middle" ? "selected" : ""}>\u4E2D\u90E8</option>
          <option value="bottom" ${config.liveUI?.danmaku?.position === "bottom" ? "selected" : ""}>\u5E95\u90E8</option>
        </select>
        \u5F39\u5E55\u4F4D\u7F6E
      </label>
      <label>
        <input type="number" id="danmaku-maxLines" min="1" max="10" value="${config.liveUI?.danmaku?.maxLines ?? 5}" />
        \u6700\u5927\u5F39\u5E55\u884C\u6570
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u5E03\u5C40\u8BBE\u7F6E</h3>
      <label>
        <select id="live-layout">
          <option value="default" ${config.liveUI?.layout === "default" ? "selected" : ""}>\u9ED8\u8BA4</option>
          <option value="minimal" ${config.liveUI?.layout === "minimal" ? "selected" : ""}>\u6781\u7B80</option>
          <option value="immersive" ${config.liveUI?.layout === "immersive" ? "selected" : ""}>\u6C89\u6D78</option>
        </select>
        \u5E03\u5C40\u7C7B\u578B
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u97F3\u91CF\u8BBE\u7F6E</h3>
      <label>
        <input type="range" id="live-volume" min="0" max="100" step="5" value="${config.liveUI?.volume ?? 100}" />
        \u97F3\u91CF: <span id="live-volume-value">${config.liveUI?.volume ?? 100}%</span>
      </label>
    </div>
  `;
  }
  function createImportExportSettings() {
    return `
    <div class="setting-group">
      <h3>\u914D\u7F6E\u5BFC\u5165</h3>
      <textarea id="importConfig" placeholder="\u7C98\u8D34\u914D\u7F6EJSON\u5B57\u7B26\u4E32" rows="5" cols="40"></textarea>
      <button id="importBtn" class="action-btn" aria-label="\u5BFC\u5165\u914D\u7F6E">\u5BFC\u5165\u914D\u7F6E</button>
    </div>
    
    <div class="setting-group">
      <h3>\u914D\u7F6E\u5BFC\u51FA</h3>
      <button id="exportBtn" class="action-btn" aria-label="\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E">\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E</button>
      <textarea id="exportConfig" placeholder="\u914D\u7F6E\u5C06\u5728\u8FD9\u91CC\u663E\u793A" rows="5" cols="40"></textarea>
      <button id="copyBtn" class="action-btn" aria-label="\u590D\u5236\u914D\u7F6E\u5230\u526A\u8D34\u677F">\u590D\u5236\u5230\u526A\u8D34\u677F</button>
    </div>
  `;
  }
  function createAdvancedSettings(config) {
    return `
    <div class="setting-group">
      <h3>\u9AD8\u7EA7\u529F\u80FD</h3>
      <label>
        <input type="checkbox" id="advanced-debugMode" ${config.advanced?.debugMode ?? false ? "checked" : ""} />
        \u542F\u7528\u8C03\u8BD5\u6A21\u5F0F
      </label>
      <label>
        <input type="checkbox" id="advanced-performanceMode" ${config.advanced?.performanceMode ?? false ? "checked" : ""} />
        \u542F\u7528\u6027\u80FD\u6A21\u5F0F
      </label>
    </div>
    
    <div class="setting-group">
      <h3>\u81EA\u5B9A\u4E49CSS</h3>
      <textarea id="advanced-customCSS" placeholder="\u8F93\u5165\u81EA\u5B9A\u4E49CSS\u4EE3\u7801" rows="5" cols="40">${escapeHtml(config.advanced?.customCSS ?? "")}</textarea>
      <small>\u6CE8\u610F\uFF1A\u81EA\u5B9A\u4E49CSS\u53EF\u80FD\u4F1A\u5F71\u54CD\u9875\u9762\u6027\u80FD</small>
    </div>

    <div class="setting-group">
      <h3>\u81EA\u5B9A\u4E49\u811A\u672C</h3>
      <div id="custom-scripts-list">
        ${(config.advanced?.customScripts ?? []).map((script, index) => `
          <div class="script-item">
            <input type="text" value="${escapeHtml(script)}" data-index="${String(index)}" placeholder="\u811A\u672CURL\u6216\u4EE3\u7801" />
            <button class="remove-script" data-index="${String(index)}" aria-label="\u5220\u9664\u7B2C ${index + 1} \u4E2A\u811A\u672C">\u5220\u9664</button>
          </div>
        `).join("")}
      </div>
      <button id="add-script" aria-label="\u6DFB\u52A0\u81EA\u5B9A\u4E49\u811A\u672C">\u6DFB\u52A0\u811A\u672C</button>
      <small>\u6CE8\u610F\uFF1A\u81EA\u5B9A\u4E49\u811A\u672C\u53EF\u80FD\u4F1A\u5E26\u6765\u5B89\u5168\u98CE\u9669\uFF0C\u8BF7\u8C28\u614E\u4F7F\u7528</small>
    </div>
  `;
  }
  function createAutoExecutorSettings() {
    return `
    <div class="setting-group">
      <h3>\u81EA\u52A8\u6267\u884C\u63A7\u5236\u5668</h3>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="auto-executor-enable" />
          <span class="slider"></span>
        </label>
        <span>\u542F\u7528\u81EA\u52A8\u6267\u884C\u63A7\u5236\u5668</span>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>\u63A7\u5236\u4E2D\u5FC3</h3>
      <div class="button-group">
        <div>
          <button id="auto-executor-start" class="ui-button primary" aria-label="\u5F00\u59CB\u81EA\u52A8\u6267\u884C">\u5F00\u59CB\u6267\u884C</button>
          <button id="auto-executor-stop" class="ui-button secondary" aria-label="\u505C\u6B62\u81EA\u52A8\u6267\u884C">\u505C\u6B62\u6267\u884C</button>
        </div>
        <button id="auto-executor-emergency" class="ui-button danger" aria-label="\u7D27\u6025\u505C\u6B62">\u7D27\u6025\u505C\u6B62</button>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>\u914D\u7F6E\u9009\u9879</h3>
      <div class="setting-item">
        <label for="check-interval">\u68C0\u67E5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09:</label>
        <input type="number" id="check-interval" value="1000" min="500" max="10000" />
      </div>
      <div class="setting-item">
        <label for="max-attempts">\u6700\u5927\u91CD\u8BD5\u6B21\u6570:</label>
        <input type="number" id="max-attempts" value="10" min="1" max="50" />
      </div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="enable-logging" />
          <span class="slider"></span>
        </label>
        <span>\u542F\u7528\u65E5\u5FD7\u8BB0\u5F55</span>
      </div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="require-confirmation" />
          <span class="slider"></span>
        </label>
        <span>\u9700\u8981\u786E\u8BA4</span>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>\u6267\u884C\u72B6\u6001</h3>
      <div class="status-info">
        <div><strong>\u72B6\u6001:</strong> <span id="executor-status">\u672A\u8FD0\u884C</span></div>
        <div><strong>\u5F53\u524D\u5C1D\u8BD5:</strong> <span id="current-attempt">0</span></div>
        <div><strong>\u5386\u53F2\u8BB0\u5F55:</strong> <span id="execution-history">0</span></div>
      </div>
    </div>
  `;
  }
  function injectPanelStyles() {
    injectStyle(`
    .douyin-ui-customizer-panel {
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `);
  }

  // src/ui/panels/settingsEvents.ts
  function setupSettingsPanelEvents(panel, uiManager2) {
    const closeBtn = panel.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        panel.remove();
      });
    }
    const tabBtns = panel.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        if (!tabId) return;
        tabBtns.forEach((b) => b.classList.remove("active"));
        panel.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const tabContent = panel.querySelector(`#${tabId}-tab`);
        if (tabContent) {
          tabContent.classList.add("active");
        }
      });
    });
    const saveBtn = panel.querySelector(".save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        uiManager2.saveSettings(panel);
      });
    }
    const resetBtn = panel.querySelector(".reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("\u786E\u5B9A\u8981\u91CD\u7F6E\u6240\u6709\u8BBE\u7F6E\u5417\uFF1F")) {
          uiManager2.config = window.resetConfig?.() || uiManager2.config;
          panel.remove();
          location.reload();
        }
      });
    }
    initImportExport(panel, uiManager2);
    setupAutoExecutorEvents(panel, uiManager2);
  }
  function initImportExport(panel, uiManager2) {
    if (!panel) return;
    const exportBtn = panel.querySelector("#exportBtn");
    const exportConfig2 = panel.querySelector("#exportConfig");
    const copyBtn = panel.querySelector("#copyBtn");
    if (exportBtn && exportConfig2) {
      exportBtn.addEventListener("click", () => {
        try {
          exportConfig2.value = JSON.stringify(uiManager2.config, null, 2);
        } catch (error) {
          logger_default.error("\u5BFC\u51FA\u914D\u7F6E\u5931\u8D25:", error);
          alert("\u5BFC\u51FA\u914D\u7F6E\u5931\u8D25");
        }
      });
    }
    if (copyBtn && exportConfig2) {
      copyBtn.addEventListener("click", () => {
        exportConfig2.select();
        try {
          document.execCommand("copy");
          alert("\u914D\u7F6E\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
        } catch (error) {
          logger_default.error("\u590D\u5236\u5931\u8D25:", error);
          alert("\u590D\u5236\u5931\u8D25");
        }
      });
    }
    const importBtn = panel.querySelector("#importBtn");
    const importConfig2 = panel.querySelector("#importConfig");
    if (importBtn && importConfig2) {
      importBtn.addEventListener("click", () => {
        try {
          const newConfig = JSON.parse(importConfig2.value);
          uiManager2.config = newConfig;
          uiManager2.saveConfig();
          alert("\u914D\u7F6E\u5BFC\u5165\u6210\u529F");
          location.reload();
        } catch (error) {
          logger_default.error("\u5BFC\u5165\u914D\u7F6E\u5931\u8D25:", error);
          alert("\u5BFC\u5165\u914D\u7F6E\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5JSON\u683C\u5F0F");
        }
      });
    }
  }
  function setupAutoExecutorEvents(panel, uiManager2) {
    logger_default.info("Auto executor events temporarily disabled");
  }
  function applySettingsToPanel(uiManager2) {
    const panel = uiManager2.settingsPanel;
    if (!panel) return;
    uiManager2.applyTheme(uiManager2.config.theme || "light");
    logger_default.info("Settings applied to panel");
    panel.querySelectorAll('input[type="radio"][name="theme"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        uiManager2.config.theme = e.target.value;
        uiManager2.applyTheme(uiManager2.config.theme);
        uiManager2.saveConfig();
      });
    });
    const generalSettings = ["autoPlay", "autoScroll", "keyboardShortcuts", "notifications"];
    generalSettings.forEach((setting) => {
      const checkbox = panel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          if (!uiManager2.config.general) uiManager2.config.general = {};
          uiManager2.config.general[setting] = e.target.checked;
          uiManager2.saveConfig();
        });
      }
    });
    const videoSettings = ["showLikeButton", "showCommentButton", "showShareButton", "showAuthorInfo", "showMusicInfo", "showDescription", "showRecommendations"];
    videoSettings.forEach((setting) => {
      const checkbox = panel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          if (!uiManager2.config.videoUI) uiManager2.config.videoUI = {};
          uiManager2.config.videoUI[setting] = e.target.checked;
          uiManager2.saveConfig();
          uiManager2.applyVideoCustomizations();
        });
      }
    });
    const controlBarSettings = ["controlBar-show", "controlBar-autoHide", "controlBar-position", "controlBar-size", "controlBar-opacity"];
    controlBarSettings.forEach((setting) => {
      const element = panel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener("change", (e) => {
          if (!uiManager2.config.videoUI) uiManager2.config.videoUI = {};
          if (!uiManager2.config.videoUI.controlBar) uiManager2.config.videoUI.controlBar = {};
          const controlBarSetting = setting.replace("controlBar-", "");
          let value = e.target.value;
          if (e.target.type === "checkbox") {
            value = e.target.checked;
          } else if (controlBarSetting === "opacity") {
            value = parseFloat(value);
            const valueElement = panel.querySelector("#controlBar-opacity-value");
            if (valueElement) valueElement.textContent = `${value * 100}%`;
          }
          uiManager2.config.videoUI.controlBar[controlBarSetting] = value;
          uiManager2.saveConfig();
          uiManager2.applyVideoCustomizations();
        });
      }
    });
    const playbackSettings = ["playback-defaultQuality", "playback-autoPlay", "playback-loop"];
    playbackSettings.forEach((setting) => {
      const element = panel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener("change", (e) => {
          if (!uiManager2.config.videoUI) uiManager2.config.videoUI = {};
          if (!uiManager2.config.videoUI.playback) uiManager2.config.videoUI.playback = {};
          const playbackSetting = setting.replace("playback-", "");
          let value = e.target.value;
          if (e.target.type === "checkbox") value = e.target.checked;
          uiManager2.config.videoUI.playback[playbackSetting] = value;
          uiManager2.saveConfig();
          uiManager2.applyVideoCustomizations();
        });
      }
    });
    const liveSettings = ["liveShowGifts", "liveShowDanmaku", "liveShowRecommendations", "liveShowAds", "liveShowStats"];
    liveSettings.forEach((setting) => {
      const checkbox = panel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          if (!uiManager2.config.liveUI) uiManager2.config.liveUI = {};
          const liveSetting = setting.replace("liveShow", "show");
          uiManager2.config.liveUI[liveSetting] = e.target.checked;
          uiManager2.saveConfig();
          uiManager2.applyLiveCustomizations();
        });
      }
    });
    const danmakuSettings = ["danmaku-fontSize", "danmaku-color", "danmaku-opacity", "danmaku-speed", "danmaku-position", "danmaku-maxLines"];
    danmakuSettings.forEach((setting) => {
      const element = panel.querySelector(`#${setting}`);
      if (element) {
        element.addEventListener("change", (e) => {
          if (!uiManager2.config.liveUI) uiManager2.config.liveUI = {};
          if (!uiManager2.config.liveUI.danmaku) uiManager2.config.liveUI.danmaku = {};
          const danmakuSetting = setting.replace("danmaku-", "");
          let value = e.target.value;
          if (danmakuSetting === "fontSize" || danmakuSetting === "maxLines") {
            value = parseInt(value);
            if (danmakuSetting === "fontSize") {
              const valueElement = panel.querySelector("#danmaku-fontSize-value");
              if (valueElement) valueElement.textContent = `${value}px`;
            }
          } else if (danmakuSetting === "opacity") {
            value = parseFloat(value);
            const valueElement = panel.querySelector("#danmaku-opacity-value");
            if (valueElement) valueElement.textContent = `${value * 100}%`;
          }
          uiManager2.config.liveUI.danmaku[danmakuSetting] = value;
          uiManager2.saveConfig();
          uiManager2.applyLiveCustomizations();
        });
      }
    });
    const liveLayoutSelect = panel.querySelector("#live-layout");
    if (liveLayoutSelect) {
      liveLayoutSelect.addEventListener("change", (e) => {
        if (!uiManager2.config.liveUI) uiManager2.config.liveUI = {};
        uiManager2.config.liveUI.layout = e.target.value;
        uiManager2.saveConfig();
        uiManager2.applyLiveCustomizations();
      });
    }
    const liveVolumeSlider = panel.querySelector("#live-volume");
    if (liveVolumeSlider) {
      liveVolumeSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        const valueElement = panel.querySelector("#live-volume-value");
        if (valueElement) valueElement.textContent = `${value}%`;
        if (!uiManager2.config.liveUI) uiManager2.config.liveUI = {};
        uiManager2.config.liveUI.volume = value;
        uiManager2.saveConfig();
        uiManager2.applyLiveCustomizations();
      });
    }
    const advancedSettings = ["advanced-debugMode", "advanced-performanceMode"];
    advancedSettings.forEach((setting) => {
      const checkbox = panel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          if (!uiManager2.config.advanced) uiManager2.config.advanced = {};
          const advancedSetting = setting.replace("advanced-", "");
          uiManager2.config.advanced[advancedSetting] = e.target.checked;
          uiManager2.saveConfig();
        });
      }
    });
    const customCSS = panel.querySelector("#advanced-customCSS");
    if (customCSS) {
      customCSS.addEventListener("input", (e) => {
        if (!uiManager2.config.advanced) uiManager2.config.advanced = {};
        uiManager2.config.advanced.customCSS = e.target.value;
        uiManager2.saveConfig();
      });
    }
    const addScriptBtn = panel.querySelector("#add-script");
    if (addScriptBtn) {
      addScriptBtn.addEventListener("click", () => {
        const scriptsList = panel.querySelector("#custom-scripts-list");
        if (scriptsList) {
          const index = scriptsList.children.length;
          const scriptItem = document.createElement("div");
          scriptItem.className = "script-item";
          scriptItem.innerHTML = `
          <input type="text" data-index="${index}" placeholder="\u811A\u672CURL\u6216\u4EE3\u7801" />
          <button class="remove-script" data-index="${index}">\u5220\u9664</button>
        `;
          scriptsList.appendChild(scriptItem);
          const removeBtn = scriptItem.querySelector(".remove-script");
          if (removeBtn) {
            removeBtn.addEventListener("click", () => {
              scriptItem.remove();
              uiManager2.saveConfig();
            });
          }
          const input = scriptItem.querySelector("input");
          if (input) {
            input.addEventListener("input", () => uiManager2.saveConfig());
          }
        }
      });
    }
    const removeScriptBtns = panel.querySelectorAll(".remove-script");
    removeScriptBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const scriptItem = btn.closest(".script-item");
        if (scriptItem) {
          scriptItem.remove();
          uiManager2.saveConfig();
        }
      });
    });
    const scriptInputs = panel.querySelectorAll("#custom-scripts-list .script-item input");
    scriptInputs.forEach((input) => {
      input.addEventListener("input", () => uiManager2.saveConfig());
    });
  }

  // src/ui/core/panelDrag.ts
  function makePanelDraggable(panel) {
    if (!panel) return;
    const header = panel.querySelector(".panel-header");
    if (!header) return;
    panel.style.transform = "none";
    let isDragging = false;
    let offsetX, offsetY;
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      panel.classList.add("dragging");
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";
    });
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove("dragging");
      restrictPanelToViewport(panel);
    });
    header.addEventListener("touchstart", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      const touch = e.touches[0];
      const rect = panel.getBoundingClientRect();
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
      panel.classList.add("dragging");
      e.preventDefault();
    }, { passive: false });
    document.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      let newLeft = touch.clientX - offsetX;
      let newTop = touch.clientY - offsetY;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";
    }, { passive: false });
    document.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove("dragging");
      restrictPanelToViewport(panel);
    });
  }
  function restrictPanelToViewport(panel) {
    if (!panel) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panel.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;
    let left = rect.left;
    let top = rect.top;
    if (left < 0) {
      left = 0;
    } else if (left + panelWidth > viewportWidth) {
      left = viewportWidth - panelWidth;
    }
    if (top < 0) {
      top = 0;
    } else if (top + panelHeight > viewportHeight) {
      top = viewportHeight - panelHeight;
    }
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  // src/ui/customizations/videoCustomizations.ts
  function applyVideoCustomizations(uiManager2) {
    logger_default.info("[UI\u5B9A\u5236] \u5F00\u59CB\u5E94\u7528\u77ED\u89C6\u9891\u754C\u9762\u5B9A\u5236");
    const { videoUI } = uiManager2.config;
    if (!videoUI) {
      logger_default.warn("[UI\u5B9A\u5236] \u8B66\u544A\uFF1AvideoUI\u914D\u7F6E\u7F3A\u5931");
      return;
    }
    logger_default.info("[UI\u5B9A\u5236] \u89C6\u9891UI\u914D\u7F6E:", JSON.stringify(videoUI));
    if (!document.body) {
      logger_default.warn("[UI\u5B9A\u5236] \u8B66\u544A\uFF1Adocument.body\u672A\u51C6\u5907\u597D\uFF0C\u5EF6\u8FDF\u5E94\u7528\u5B9A\u5236");
      setTimeout(() => uiManager2.applyVideoCustomizations(), 500);
      return;
    }
    uiManager2.toggleElement(() => {
      logger_default.info("[UI\u5B9A\u5236] \u67E5\u627E\u70B9\u8D5E\u6309\u94AE\u5143\u7D20...");
      const heartIcons = uiManager2.findElementsByStructure({
        tagName: "svg",
        attributes: { viewBox: "0 0 1024 1024" }
      });
      if (heartIcons.length > 0) {
        logger_default.info(`[UI\u5B9A\u5236] \u627E\u5230 ${heartIcons.length} \u4E2A\u53EF\u80FD\u7684\u70B9\u8D5E\u56FE\u6807`);
        const elements = heartIcons.map((icon) => icon.closest("div") || icon);
        logger_default.info(`[UI\u5B9A\u5236] \u83B7\u53D6\u5230 ${elements.length} \u4E2A\u70B9\u8D5E\u76F8\u5173\u5143\u7D20`);
        return elements;
      }
      logger_default.info("[UI\u5B9A\u5236] \u5C1D\u8BD5\u901A\u8FC7\u7C7B\u540D\u6A21\u5F0F\u5339\u914D\u70B9\u8D5E\u6309\u94AE");
      const classElements = uiManager2.findElementsByClassPattern(/like|heart|favorite/i);
      logger_default.info(`[UI\u5B9A\u5236] \u901A\u8FC7\u7C7B\u540D\u627E\u5230 ${classElements.length} \u4E2A\u53EF\u80FD\u7684\u70B9\u8D5E\u5143\u7D20`);
      return classElements;
    }, videoUI.showLikeButton);
    uiManager2.toggleElement(() => {
      logger_default.info("[UI\u5B9A\u5236] \u5F00\u59CB\u67E5\u627E\u8BC4\u8BBA\u5143\u7D20...");
      const commentElements = uiManager2.findElementsByStructure({
        tagName: "div",
        children: [{ tagName: "svg", attributes: { viewBox: "0 0 1024 1024" } }]
      });
      if (commentElements.length > 0) return commentElements;
      return uiManager2.findElementsByClassPattern(/comment|discuss/i);
    }, videoUI.showCommentButton);
    uiManager2.toggleElement(() => {
      const shareElements = uiManager2.findElementsByStructure({
        tagName: "div",
        children: [{ tagName: "svg", attributes: { viewBox: "0 0 1024 1024" } }]
      });
      if (shareElements.length > 0) {
        return shareElements.filter((el) => {
          const text = el.textContent.toLowerCase();
          return text.includes("share") || text.includes("\u5206\u4EAB");
        });
      } else {
        return uiManager2.findElementsByClassPattern(/share|forward/i);
      }
    }, videoUI.showShareButton);
    uiManager2.toggleElement(() => {
      const avatarElements = uiManager2.findElementsByStructure({
        tagName: "img",
        attributes: { class: /avatar|user/i }
      });
      if (avatarElements.length > 0) {
        return avatarElements.map((img) => img.closest("div") || img);
      }
      return uiManager2.findElementsByClassPattern(/author|user|avatar/i);
    }, videoUI.showAuthorInfo);
    uiManager2.toggleElement(() => {
      const musicElements = uiManager2.findElementsByStructure({ text: "\u97F3\u4E50" });
      if (musicElements.length > 0) {
        return musicElements.map((el) => el.closest("div") || el);
      }
      return uiManager2.findElementsByClassPattern(/music|sound/i);
    }, videoUI.showMusicInfo);
    uiManager2.toggleElement(() => {
      const textElements = uiManager2.findElementsByClassPattern(/desc|description|content|title|caption|描述|内容|标题/i);
      const descriptions = textElements.filter((el) => {
        return el.textContent.length > 20 && el.textContent.length < 200 && el.querySelector("img") && el.querySelector("video");
      });
      if (descriptions.length > 0) return descriptions;
      return uiManager2.findElementsByClassPattern(/desc|description|content/i);
    }, videoUI.showDescription);
    uiManager2.toggleElement(() => {
      const recommendationContainers = uiManager2.findElementsByStructure({
        tagName: "div",
        children: [{ tagName: "video" }]
      });
      if (recommendationContainers.length > 0) return recommendationContainers;
      return uiManager2.findElementsByClassPattern(/recommend|suggest|related/i);
    }, videoUI.showRecommendations);
    if (videoUI.controlBar) {
      uiManager2.customizeControlBar(videoUI.controlBar);
    }
    uiManager2.applyLayout("video", videoUI.layout);
  }

  // src/ui/customizations/liveCustomizations.ts
  function applyLiveCustomizations(uiManager2) {
    logger_default.info("\u5E94\u7528\u76F4\u64AD\u95F4\u754C\u9762\u5B9A\u5236");
    const { liveUI } = uiManager2.config;
    if (!liveUI) return;
    uiManager2.toggleElement(() => {
      logger_default.info("[UI\u5B9A\u5236] \u5F00\u59CB\u67E5\u627E\u793C\u7269\u5143\u7D20...");
      let giftElements = [];
      giftElements = giftElements.concat(
        uiManager2.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
      );
      giftElements = giftElements.concat(
        uiManager2.findElementsByStructure({
          attributes: { class: /gift|present|reward|award|effect|animation/i }
        })
      );
      const potentialGiftAnims = uiManager2.findElementsByClassPattern(/^(gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送)/i).filter((el) => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        return (style.animationName !== "none" || style.transitionProperty.includes("transform") || style.transform !== "none") && zIndex > 100 && style.position === "absolute";
      });
      giftElements = giftElements.concat(potentialGiftAnims);
      const textGiftElements = uiManager2.findElementsByStructure({
        text: /礼物|特效|打赏|赠送|连击|连击奖励|豪华礼物/i
      });
      if (textGiftElements.length > 0) {
        textGiftElements.forEach((el) => {
          giftElements.push(el);
          giftElements.push(el.closest("div") || el);
          giftElements.push(el.closest(".gift-container") || el);
          giftElements.push(el.closest(".animation-container") || el);
        });
      }
      giftElements = [...new Set(giftElements)];
      logger_default.info(`[UI\u5B9A\u5236] \u627E\u5230 ${giftElements.length} \u4E2A\u793C\u7269\u76F8\u5173\u5143\u7D20`);
      return giftElements;
    }, liveUI.showGifts);
    uiManager2.toggleElement(() => {
      const bulletElements = uiManager2.findElementsByClassPattern(/danmu|bullet|danmaku|弹幕/i);
      const potentialBullets = bulletElements.filter((el) => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        return style.position === "absolute" && style.pointerEvents === "none" && zIndex > 0;
      });
      if (potentialBullets.length > 0) return potentialBullets;
      return uiManager2.findElementsByClassPattern(/danmu|bullet|comment|danmaku/i);
    }, liveUI.showDanmaku);
    uiManager2.toggleElement(() => {
      const recommendationContainers = uiManager2.findElementsByStructure({
        tagName: "div",
        children: [{ tagName: "img" }]
      });
      if (recommendationContainers.length > 0) return recommendationContainers;
      return uiManager2.findElementsByClassPattern(/recommend|suggest|related|live-recommend/i);
    }, liveUI.showRecommendations);
    uiManager2.toggleElement(() => {
      const adElements = uiManager2.findElementsByStructure({ text: /广告|推广|ad|promotion/i });
      if (adElements.length > 0) {
        return adElements.map((el) => el.closest("div") || el);
      }
      return uiManager2.findElementsByClassPattern(/ad|advertisement|promotion|广告/i);
    }, liveUI.showAds);
    uiManager2.toggleElement(() => {
      const numberElements = uiManager2.findElementsByClassPattern(/stat|count|number|view|统计|数字|数量/i);
      const potentialStats = numberElements.filter((el) => {
        return /\d+/.test(el.textContent);
      });
      if (potentialStats.length > 0) return potentialStats;
      return uiManager2.findElementsByClassPattern(/stat|count|number|view/i);
    }, liveUI.showStats);
    if (liveUI.danmaku) {
      uiManager2.customizeDanmaku(liveUI.danmaku);
    }
    uiManager2.applyLayout("live", liveUI.layout);
  }

  // src/ui_manager.ts
  var UIManager = class {
    constructor(config) {
      this.config = config;
      this.settingsPanel = null;
      this.toggleButton = null;
      this.isPanelVisible = false;
      this.lastScrollPosition = 0;
      this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
      this.throttledHandleScroll = throttle((...args) => {
        const e = args[0];
        this.handleScroll(e);
      }, 100);
      this.mutationObserver = null;
      this.domObserver = null;
      this.autoExecutorStatusInterval = null;
      this.autoExecutor = autoExecutor_default;
      logger_default.info("UIManager initialized with config");
      theme_default.on("themeChanged", (newTheme) => {
        logger_default.info(`Theme changed to ${newTheme}`);
        this.applyTheme(newTheme);
      });
    }
    applyVideoCustomizations() {
      applyVideoCustomizations(this);
    }
    applyLiveCustomizations() {
      applyLiveCustomizations(this);
    }
    toggleElement(selectorOrFinder, show) {
      let elements = [];
      if (typeof selectorOrFinder === "function") {
        try {
          elements = selectorOrFinder() || [];
        } catch (e) {
          logger_default.error("\u67E5\u627E\u5143\u7D20\u51FD\u6570\u6267\u884C\u5931\u8D25:", e);
          return;
        }
      } else if (typeof selectorOrFinder === "string" && selectorOrFinder.trim() !== "") {
        try {
          elements = getElements(selectorOrFinder);
        } catch (e) {
          logger_default.error("\u65E0\u6548\u7684CSS\u9009\u62E9\u5668:", selectorOrFinder, e);
          return;
        }
      } else {
        logger_default.error("\u65E0\u6548\u7684\u9009\u62E9\u5668\u6216\u67E5\u627E\u51FD\u6570\u53C2\u6570");
        return;
      }
      toggleElements(elements, show);
    }
    findElementsByStructure(options) {
      return findElementsByStructure(options);
    }
    findElementsByClassPattern(pattern, container) {
      return findElementsByClassPattern(pattern, container);
    }
    customizeControlBar(controlBarConfig) {
      const controlBar = document.querySelector(".video-control-bar");
      if (!controlBar) return;
      if (!controlBarConfig.show) {
        controlBar.style.display = "none";
        return;
      }
      if (controlBarConfig.position) {
        controlBar.style.position = "absolute";
        switch (controlBarConfig.position) {
          case "top":
            controlBar.style.top = "0";
            controlBar.style.bottom = "auto";
            break;
          case "bottom":
            controlBar.style.bottom = "0";
            controlBar.style.top = "auto";
            break;
          default:
            controlBar.style.bottom = "0";
        }
      }
    }
    customizeDanmaku(danmakuConfig) {
      const styleId = "douyin-danmaku-custom-styles";
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      let css = "";
      if (danmakuConfig.fontSize) {
        css += `.danmaku { font-size: ${danmakuConfig.fontSize}px !important; }`;
      }
      if (danmakuConfig.color) {
        css += `.danmaku { color: ${danmakuConfig.color} !important; }`;
      }
      if (danmakuConfig.opacity) {
        css += `.danmaku { opacity: ${danmakuConfig.opacity} !important; }`;
      }
      if (danmakuConfig.speed) {
        let duration = 6;
        switch (danmakuConfig.speed) {
          case "fast":
            duration = 3;
            break;
          case "slow":
            duration = 10;
            break;
          default:
            duration = 6;
        }
        css += `.danmaku { animation-duration: ${duration}s !important; }`;
      }
      styleElement.textContent = css;
    }
    hideSettingsPanel() {
      if (!this.settingsPanel) return;
      this.isPanelVisible = false;
      this.settingsPanel.style.transition = "opacity 0.3s ease-out";
      this.settingsPanel.style.opacity = "0";
      setTimeout(() => {
        if (this.settingsPanel) {
          this.settingsPanel.style.display = "none";
        }
      }, 300);
    }
    applyLayout(type, layout) {
      if (!layout || layout === "default") return;
      logger_default.info(`\u5E94\u7528${type}\u5E03\u5C40\uFF1A${layout}`);
    }
    showSettingsPanel() {
      if (this.settingsPanel) {
        this.settingsPanel.remove();
      }
      this.settingsPanel = this.createSettingsPanel();
      document.body.appendChild(this.settingsPanel);
      this.makePanelDraggable(this.settingsPanel);
    }
    createSettingsPanel() {
      const panel = createElement("div", {
        className: "douyin-ui-customizer-panel",
        style: { animation: "slideIn 0.3s ease-out" }
      });
      injectPanelStyles();
      panel.innerHTML = createSettingsPanelContent(this.config);
      setupSettingsPanelEvents(panel, this);
      return panel;
    }
    makePanelDraggable(panel) {
      makePanelDraggable(panel);
      restrictPanelToViewport(panel);
    }
    applyAllCustomizations() {
      logger_default.info("[UI\u5B9A\u5236] \u5F00\u59CB\u7EDF\u4E00\u5E94\u7528\u6240\u6709UI\u5B9A\u5236");
      try {
        const pageType = this.detectPageType();
        logger_default.info(`[UI\u5B9A\u5236] \u68C0\u6D4B\u5230\u9875\u9762\u7C7B\u578B: ${pageType}`);
        switch (pageType) {
          case "video":
            this.applyVideoCustomizations();
            break;
          case "live":
            this.applyLiveCustomizations();
            break;
          default:
            logger_default.info("[UI\u5B9A\u5236] \u672A\u8BC6\u522B\u7684\u9875\u9762\u7C7B\u578B\uFF0C\u5C1D\u8BD5\u5E94\u7528\u901A\u7528\u5B9A\u5236");
            this.applyVideoCustomizations();
        }
        if (this.config.theme) {
          this.applyTheme(this.config.theme);
        }
      } catch (error) {
        logger_default.error("[UI\u5B9A\u5236] \u5E94\u7528\u5B9A\u5236\u65F6\u51FA\u9519:", error);
      }
    }
    detectPageType() {
      if (document.querySelector("video[autoplay]")) return "video";
      if (document.querySelector('.live, .live-room, [data-type="live"]')) return "live";
      return "other";
    }
    handleScroll(e) {
      const currentScroll = window.scrollY;
      const direction = currentScroll > this.lastScrollPosition ? "down" : "up";
      this.lastScrollPosition = currentScroll;
      if (this.settingsPanel && this.isPanelVisible) {
        if (direction === "down" && currentScroll > 100) {
          this.hideSettingsPanel();
        }
      }
    }
    applyTheme(theme) {
      try {
        theme_default.applyTheme(theme);
        if (this.settingsPanel) {
          const themeConfig = theme_default.getTheme(theme);
          if (themeConfig && themeConfig.variables) {
            const themeConfigObj = themeConfig.variables;
            this.settingsPanel.style.backgroundColor = themeConfigObj["--bg-primary"] || "#fff";
            this.settingsPanel.style.color = themeConfigObj["--text-primary"] || "#000";
            this.settingsPanel.style.borderColor = themeConfigObj["--border-color"] || "#e0e0e0";
            const buttons = this.settingsPanel.querySelectorAll("button");
            buttons.forEach((btn) => {
              btn.style.backgroundColor = themeConfigObj["--bg-secondary"] || "#f5f5f5";
              btn.style.color = themeConfigObj["--text-primary"] || "#333";
            });
          }
        }
        logger_default.info(`Theme ${theme} applied successfully`);
        eventEmitter_default.emit("ui.theme.applied", theme);
      } catch (error) {
        logger_default.error("Failed to apply theme:", error);
        eventEmitter_default.emit("ui.theme.error", error);
      }
    }
    saveToLocalStorage(config) {
      try {
        const uiStorage = new NamespacedStorage("douyin_ui_customizer");
        uiStorage.setItem("config", config);
        logger_default.info("\u914D\u7F6E\u5DF2\u4FDD\u5B58\u5230localStorage");
      } catch (error) {
        logger_default.error("\u4FDD\u5B58\u5230localStorage\u5931\u8D25:", error);
      }
    }
    saveConfig() {
      try {
        this.saveToLocalStorage(this.config);
      } catch (error) {
        logger_default.error("\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25:", error);
        this.saveToLocalStorage(this.config);
      }
    }
    async saveSettings(panel) {
      try {
        const themeRadios = panel.querySelectorAll('input[type="radio"][name="theme"]');
        for (const radio of themeRadios) {
          if (radio.checked) {
            this.config.theme = radio.value;
            break;
          }
        }
        const generalSettings = ["autoPlay", "autoScroll", "keyboardShortcuts", "notifications"];
        generalSettings.forEach((setting) => {
          const checkbox = panel.querySelector(`#${setting}`);
          if (checkbox) {
            if (!this.config.general) this.config.general = {};
            this.config.general[setting] = checkbox.checked;
          }
        });
        const videoSettings = ["showLikeButton", "showCommentButton", "showShareButton", "showAuthorInfo", "showMusicInfo", "showDescription", "showRecommendations"];
        videoSettings.forEach((setting) => {
          const checkbox = panel.querySelector(`#${setting}`);
          if (checkbox) {
            if (!this.config.videoUI) this.config.videoUI = {};
            this.config.videoUI[setting] = checkbox.checked;
          }
        });
        const controlBarSettings = ["controlBar-show", "controlBar-autoHide", "controlBar-position", "controlBar-size", "controlBar-opacity"];
        controlBarSettings.forEach((setting) => {
          const element = panel.querySelector(`#${setting}`);
          if (element) {
            if (!this.config.videoUI) this.config.videoUI = {};
            if (!this.config.videoUI.controlBar) this.config.videoUI.controlBar = {};
            const controlBarSetting = setting.replace("controlBar-", "");
            let value = element.value;
            if (element.type === "checkbox") value = element.checked;
            else if (controlBarSetting === "opacity") value = parseFloat(value);
            this.config.videoUI.controlBar[controlBarSetting] = value;
          }
        });
        const playbackSettings = ["playback-defaultQuality", "playback-autoPlay", "playback-loop"];
        playbackSettings.forEach((setting) => {
          const element = panel.querySelector(`#${setting}`);
          if (element) {
            if (!this.config.videoUI) this.config.videoUI = {};
            if (!this.config.videoUI.playback) this.config.videoUI.playback = {};
            const playbackSetting = setting.replace("playback-", "");
            let value = element.value;
            if (element.type === "checkbox") value = element.checked;
            this.config.videoUI.playback[playbackSetting] = value;
          }
        });
        const liveSettings = ["liveShowGifts", "liveShowDanmaku", "liveShowRecommendations", "liveShowAds", "liveShowStats"];
        liveSettings.forEach((setting) => {
          const checkbox = panel.querySelector(`#${setting}`);
          if (checkbox) {
            if (!this.config.liveUI) this.config.liveUI = {};
            const liveSetting = setting.replace("liveShow", "show");
            this.config.liveUI[liveSetting] = checkbox.checked;
          }
        });
        const danmakuSettings = ["danmaku-fontSize", "danmaku-color", "danmaku-opacity", "danmaku-speed", "danmaku-position", "danmaku-maxLines"];
        danmakuSettings.forEach((setting) => {
          const element = panel.querySelector(`#${setting}`);
          if (element) {
            if (!this.config.liveUI) this.config.liveUI = {};
            if (!this.config.liveUI.danmaku) this.config.liveUI.danmaku = {};
            const danmakuSetting = setting.replace("danmaku-", "");
            let value = element.value;
            if (danmakuSetting === "fontSize" || danmakuSetting === "maxLines") value = parseInt(value);
            else if (danmakuSetting === "opacity") value = parseFloat(value);
            this.config.liveUI.danmaku[danmakuSetting] = value;
          }
        });
        const liveLayoutSelect = panel.querySelector("#live-layout");
        if (liveLayoutSelect) {
          if (!this.config.liveUI) this.config.liveUI = {};
          this.config.liveUI.layout = liveLayoutSelect.value;
        }
        const liveVolumeSlider = panel.querySelector("#live-volume");
        if (liveVolumeSlider) {
          if (!this.config.liveUI) this.config.liveUI = {};
          this.config.liveUI.volume = parseInt(liveVolumeSlider.value);
        }
        const debugModeCheckbox = panel.querySelector("#advanced-debugMode");
        const performanceModeCheckbox = panel.querySelector("#advanced-performanceMode");
        const customCSS = panel.querySelector("#advanced-customCSS");
        if (!this.config.advanced) this.config.advanced = {};
        if (debugModeCheckbox) this.config.advanced.debugMode = debugModeCheckbox.checked;
        if (performanceModeCheckbox) this.config.advanced.performanceMode = performanceModeCheckbox.checked;
        if (customCSS) this.config.advanced.customCSS = customCSS.value;
        const scriptItems = panel.querySelectorAll("#custom-scripts-list .script-item input");
        const customScripts = [];
        let hasScripts = false;
        scriptItems.forEach((input) => {
          const value = input.value.trim();
          if (value) {
            customScripts.push(value);
            hasScripts = true;
          }
        });
        if (hasScripts) {
          const confirmed = confirm("\u8B66\u544A\uFF1A\u81EA\u5B9A\u4E49\u811A\u672C\u53EF\u80FD\u4F1A\u5E26\u6765\u5B89\u5168\u98CE\u9669\uFF0C\u662F\u5426\u7EE7\u7EED\u4FDD\u5B58\uFF1F");
          if (!confirmed) return;
          for (const script of customScripts) {
            if (script.includes("eval(") || script.includes("Function(") || script.includes("innerHTML") || script.includes("document.write") || script.includes("execScript")) {
              const scriptConfirmed = confirm("\u8B66\u544A\uFF1A\u68C0\u6D4B\u5230\u53EF\u80FD\u7684\u5371\u9669\u4EE3\u7801\uFF0C\u662F\u5426\u786E\u8BA4\u6DFB\u52A0\u6B64\u811A\u672C\uFF1F");
              if (!scriptConfirmed) return;
            }
            if (script.startsWith("http://") || script.startsWith("https://")) {
              const allowedDomains = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com", "jsdelivr.net", "cdnjs.com"];
              const url = new URL(script);
              const domain = url.hostname;
              const isTrustedDomain = allowedDomains.some(
                (allowedDomain) => domain === allowedDomain || domain.endsWith("." + allowedDomain)
              );
              if (!isTrustedDomain) {
                const urlConfirmed = confirm(`\u8B66\u544A\uFF1A\u811A\u672CURL\u6765\u81EA\u975E\u767D\u540D\u5355\u57DF\u540D (${domain})\uFF0C\u662F\u5426\u786E\u8BA4\u6DFB\u52A0\u6B64\u811A\u672C\uFF1F`);
                if (!urlConfirmed) return;
              }
            }
          }
        }
        this.config.advanced.customScripts = customScripts;
        let validationResult = { valid: true, issues: [] };
        try {
          validationResult = this.basicValidateConfig(this.config);
        } catch (error) {
          logger_default.error("\u9A8C\u8BC1\u914D\u7F6E\u5931\u8D25:", error);
          validationResult = this.basicValidateConfig(this.config);
        }
        if (!validationResult.valid) {
          const errorMessage = "\u914D\u7F6E\u9A8C\u8BC1\u5931\u8D25\uFF1A\n" + validationResult.issues.join("\n");
          alert(errorMessage);
          return;
        }
        this.saveConfig();
        logger_default.info("Settings saved from panel");
        this.applyAllCustomizations();
        alert("\u8BBE\u7F6E\u4FDD\u5B58\u6210\u529F\uFF01");
      } catch (error) {
        logger_default.error("\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25:", error);
        alert("\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
      }
    }
    basicValidateConfig(config) {
      const issues = [];
      try {
        if (config.theme && !["light", "dark"].includes(config.theme)) {
          issues.push("\u4E3B\u9898\u914D\u7F6E\u65E0\u6548\uFF0C\u5E94\u4E3A light \u6216 dark");
        }
        if (config.videoUI?.layout && !["default", "compact", "fullscreen"].includes(config.videoUI.layout)) {
          issues.push("\u89C6\u9891\u754C\u9762\u5E03\u5C40\u914D\u7F6E\u65E0\u6548");
        }
        if (config.liveUI?.layout && !["default", "minimal", "immersive"].includes(config.liveUI.layout)) {
          issues.push("\u76F4\u64AD\u95F4\u754C\u9762\u5E03\u5C40\u914D\u7F6E\u65E0\u6548");
        }
        if (config.liveUI?.danmaku?.fontSize && (config.liveUI.danmaku.fontSize < 12 || config.liveUI.danmaku.fontSize > 36)) {
          issues.push("\u5F39\u5E55\u5B57\u4F53\u5927\u5C0F\u5E94\u5728 12-36 \u4E4B\u95F4");
        }
        if (config.liveUI?.danmaku?.opacity && (config.liveUI.danmaku.opacity < 0.1 || config.liveUI.danmaku.opacity > 1)) {
          issues.push("\u5F39\u5E55\u900F\u660E\u5EA6\u5E94\u5728 0.1-1 \u4E4B\u95F4");
        }
        if (config.liveUI?.volume && (config.liveUI.volume < 0 || config.liveUI.volume > 100)) {
          issues.push("\u97F3\u91CF\u5E94\u5728 0-100 \u4E4B\u95F4");
        }
        if (config.videoUI?.controlBar?.opacity && (config.videoUI.controlBar.opacity < 0.1 || config.videoUI.controlBar.opacity > 1)) {
          issues.push("\u63A7\u5236\u680F\u900F\u660E\u5EA6\u5E94\u5728 0.1-1 \u4E4B\u95F4");
        }
      } catch (error) {
        logger_default.error("\u57FA\u672C\u9A8C\u8BC1\u914D\u7F6E\u5931\u8D25:", error);
        issues.push("\u914D\u7F6E\u9A8C\u8BC1\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF");
      }
      return { valid: issues.length === 0, issues };
    }
    init() {
      logger_default.info("[UI\u7BA1\u7406\u5668] \u521D\u59CB\u5316UI\u7BA1\u7406\u5668");
      try {
        this.initSettingsPanel();
        this.initUI();
        this.setupEvents();
      } catch (error) {
        logger_default.error("[UI\u7BA1\u7406\u5668] \u521D\u59CB\u5316\u5931\u8D25:", error);
      }
    }
    initUI() {
      logger_default.info("[UI\u7BA1\u7406\u5668] \u521D\u59CB\u5316UI\u5B9A\u5236");
      this.showToggleButton();
      this.applyAllCustomizations();
    }
    setupEvents() {
      logger_default.info("[UI\u7BA1\u7406\u5668] \u8BBE\u7F6E\u4E8B\u4EF6\u76D1\u542C");
      addEvent(window, "load", this.debouncedApplyCustomizations);
      addEvent(document, "DOMContentLoaded", this.debouncedApplyCustomizations);
      this.observeDomChanges();
      addEvent(window, "scroll", this.throttledHandleScroll);
      addEvent(window, "resize", this.debouncedApplyCustomizations);
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme)");
        if ("addEventListener" in mq) {
          addEvent(mq, "change", this.debouncedApplyCustomizations);
        }
      }
    }
    observeDomChanges() {
      if (this.domObserver) {
        this.domObserver.disconnect();
        this.domObserver = null;
      }
      const observer = new MutationObserver(this.debouncedApplyCustomizations);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      this.domObserver = observer;
    }
    cleanup() {
      logger_default.info("[UI\u7BA1\u7406\u5668] \u6E05\u7406\u8D44\u6E90\u548C\u4E8B\u4EF6\u76D1\u542C");
      if (this.domObserver) {
        this.domObserver.disconnect();
      }
      removeEvent(window, "load", this.debouncedApplyCustomizations);
      removeEvent(document, "DOMContentLoaded", this.debouncedApplyCustomizations);
      removeEvent(window, "scroll", this.throttledHandleScroll);
      removeEvent(window, "resize", this.debouncedApplyCustomizations);
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme)");
        if ("removeEventListener" in mq) {
          removeEvent(mq, "change", this.debouncedApplyCustomizations);
        }
      }
      if (this.autoExecutorStatusInterval) {
        clearInterval(this.autoExecutorStatusInterval);
      }
    }
    initSettingsPanel() {
      this.settingsPanel = document.createElement("div");
      this.settingsPanel.id = "douyin-customizer-panel";
      this.settingsPanel.className = "customizer-panel";
      this.settingsPanel.style.position = "fixed";
      this.settingsPanel.style.left = "20px";
      this.settingsPanel.style.top = "20px";
      this.settingsPanel.style.width = "320px";
      this.settingsPanel.style.maxHeight = "80vh";
      this.settingsPanel.style.overflowY = "auto";
      this.settingsPanel.style.backgroundColor = "#fff";
      this.settingsPanel.style.border = "1px solid #e0e0e0";
      this.settingsPanel.style.borderRadius = "8px";
      this.settingsPanel.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
      this.settingsPanel.style.zIndex = "9999";
      this.settingsPanel.style.padding = "20px";
      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.style.cursor = "move";
      dragHandle.style.padding = "10px";
      dragHandle.style.backgroundColor = "#f5f5f5";
      dragHandle.style.borderRadius = "4px 4px 0 0";
      dragHandle.style.marginBottom = "15px";
      dragHandle.textContent = "\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177 (\u62D6\u52A8\u79FB\u52A8)";
      const closeButton = document.createElement("button");
      closeButton.className = "close-button";
      closeButton.style.position = "absolute";
      closeButton.style.top = "10px";
      closeButton.style.right = "10px";
      closeButton.style.width = "24px";
      closeButton.style.height = "24px";
      closeButton.style.border = "none";
      closeButton.style.backgroundColor = "transparent";
      closeButton.style.cursor = "pointer";
      closeButton.style.fontSize = "18px";
      closeButton.style.lineHeight = "1";
      closeButton.textContent = "\xD7";
      closeButton.addEventListener("click", () => {
        this.settingsPanel.style.display = "none";
        this.showToggleButton();
      });
      const settingsContent = document.createElement("div");
      settingsContent.className = "settings-content";
      const tabNavigation = document.createElement("div");
      tabNavigation.className = "tab-navigation";
      tabNavigation.innerHTML = `
      <div>
        <button class="tab-button active" data-tab="general">\u901A\u7528\u8BBE\u7F6E</button>
        <button class="tab-button" data-tab="video">\u89C6\u9891\u8BBE\u7F6E</button>
      </div>
      <button class="tab-button" data-tab="live">\u76F4\u64AD\u8BBE\u7F6E</button>
    `;
      const tabContent = document.createElement("div");
      tabContent.className = "tab-content";
      const generalTab = document.createElement("div");
      generalTab.className = "tab-pane active";
      generalTab.id = "general-tab";
      generalTab.innerHTML = createSettingsPanelContent(this.config).match(/<div class="tab-content active" id="general-tab">([\s\S]*?)<\/div>\s*<div class="tab-content"/)?.[1] || "";
      const videoTab = document.createElement("div");
      videoTab.className = "tab-pane";
      videoTab.id = "video-tab";
      const liveTab = document.createElement("div");
      liveTab.className = "tab-pane";
      liveTab.id = "live-tab";
      this.settingsPanel.appendChild(dragHandle);
      this.settingsPanel.appendChild(closeButton);
      this.settingsPanel.appendChild(tabNavigation);
      tabContent.appendChild(generalTab);
      tabContent.appendChild(videoTab);
      tabContent.appendChild(liveTab);
      this.settingsPanel.appendChild(tabContent);
      document.body.appendChild(this.settingsPanel);
      this.makePanelDraggable(this.settingsPanel);
      this.restrictPanelToViewport(this.settingsPanel);
      applySettingsToPanel(this);
      tabNavigation.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => {
          const tabId = button.getAttribute("data-tab");
          tabNavigation.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
          tabContent.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));
          button.classList.add("active");
          tabContent.querySelector(`#${tabId}-tab`)?.classList.add("active");
        });
      });
      this.applyTheme(this.config.theme);
      eventEmitter_default.emit("ui.panel.initialized");
      logger_default.info("Settings panel initialized");
    }
    restrictPanelToViewport(panel) {
      restrictPanelToViewport(panel);
    }
    showToggleButton() {
      let toggleButton = document.getElementById("douyin-customizer-toggle");
      if (!toggleButton) {
        toggleButton = document.createElement("button");
        toggleButton.id = "douyin-customizer-toggle";
        toggleButton.className = "customizer-toggle";
        toggleButton.style.position = "fixed";
        toggleButton.style.left = "20px";
        toggleButton.style.bottom = "20px";
        toggleButton.style.width = "50px";
        toggleButton.style.height = "50px";
        toggleButton.style.borderRadius = "50%";
        toggleButton.style.border = "none";
        toggleButton.style.backgroundColor = "#ff0050";
        toggleButton.style.color = "white";
        toggleButton.style.fontSize = "16px";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
        toggleButton.style.zIndex = "9998";
        toggleButton.style.display = "flex";
        toggleButton.style.alignItems = "center";
        toggleButton.style.justifyContent = "center";
        toggleButton.innerHTML = "\u2699\uFE0F";
        document.body.appendChild(toggleButton);
      }
      toggleButton.style.display = "flex";
      toggleButton.addEventListener("click", () => {
        this.settingsPanel.style.display = "block";
        toggleButton.style.display = "none";
      });
    }
  };
  var ui_manager_default = UIManager;

  // src/utils/styleGenerator.ts
  function generateCustomStyles(config) {
    let customCSS = "";
    customCSS += `
    .douyin-ui-hidden {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
    }
  `;
    if (config.videoUI) {
      if (!config.videoUI.showLikeButton) {
        customCSS += ".like-button { display: none !important; }";
      }
      if (!config.videoUI.showCommentButton) {
        customCSS += ".comment-button { display: none !important; }";
      }
      if (!config.videoUI.showShareButton) {
        customCSS += ".share-button { display: none !important; }";
      }
      if (!config.videoUI.showAuthorInfo) {
        customCSS += ".author-info { display: none !important; }";
      }
      if (!config.videoUI.showMusicInfo) {
        customCSS += ".music-info, .music-label, .sound-info { display: none !important; }";
      }
      if (!config.videoUI.showDescription) {
        customCSS += ".video-desc, .description, .video-content { display: none !important; }";
      }
    }
    if (config.liveUI) {
      if (!config.liveUI.showGifts) {
        customCSS += `
        .gift-animation, .gift-container, .gift-effect, .gift-display,
        .present-animation, .reward-container, .award-animation,
        .animation-container, .live-gift, .live-gift-animation,
        [class*="gift"], [class*="present"], [class*="reward"],
        [class*="award"], [class*="effect"], [class*="animation"],
        [class*="\u7279\u6548"], [class*="\u793C\u7269"], [class*="\u6253\u8D4F"],
        [class*="\u8FDE\u51FB"], [class*="\u8C6A\u534E\u793C\u7269"], [class*="\u793C\u7269\u7279\u6548"],
        .gift-panel, .gift-button, .send-gift-button,
        [style*="animation:"], [style*="transition:"],
        [style*="z-index:"][style*="z-index: 1"],[style*="z-index: 2"],
        [style*="z-index: 3"],[style*="z-index: 4"],[style*="z-index: 5"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
      `;
      }
      if (!config.liveUI.showRecommendations) {
        customCSS += ".live-recommendations, .live-ads { display: none !important; }";
      }
      if (config.liveUI.danmaku) {
        if (config.liveUI.danmaku.fontSize) {
          customCSS += `.danmaku { font-size: ${config.liveUI.danmaku.fontSize}px !important; }`;
        }
        if (config.liveUI.danmaku.color) {
          customCSS += `.danmaku { color: ${config.liveUI.danmaku.color} !important; }`;
        }
      }
    }
    return customCSS;
  }
  async function injectStyles(themeManager2, config) {
    try {
      const success = await themeManager2.applyTheme(config.theme);
      if (!success) {
        logger_default.warn("\u4E3B\u9898\u5E94\u7528\u5931\u8D25\uFF0C\u4F7F\u7528\u5907\u7528\u6837\u5F0F\u6CE8\u5165");
        const oldStyle = document.getElementById("douyin-ui-customizer-styles");
        if (oldStyle) {
          oldStyle.remove();
        }
        const styleElement = document.createElement("style");
        styleElement.id = "douyin-ui-customizer-styles";
        styleElement.textContent = "";
        document.head.appendChild(styleElement);
      }
      const customStyle = document.createElement("style");
      customStyle.id = "douyin-ui-customizer-custom";
      customStyle.textContent = generateCustomStyles(config);
      document.head.appendChild(customStyle);
      eventEmitter_default.emit("tool.styles.updated", { theme: config.theme });
    } catch (error) {
      logger_default.error("\u6CE8\u5165\u6837\u5F0F\u5931\u8D25:", error);
    }
  }
  function injectBasicStyles() {
    const basicStyles = `
    .douyin-ui-customizer-panel {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .douyin-ui-hidden {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
    }
  `;
    injectStyle(basicStyles);
  }

  // src/utils/pageObserver.ts
  var mutationObserver = null;
  function isVideoPage() {
    return location.pathname.includes("/video/") || location.pathname === "/" || location.pathname.includes("/user/");
  }
  function isLivePage() {
    return location.pathname.includes("/live/");
  }
  function observePageChanges(uiManager2) {
    logger_default.info("\u5F00\u59CB\u76D1\u542C\u9875\u9762\u53D8\u5316...");
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
      logger_default.info("\u5DF2\u6E05\u7406\u5DF2\u5B58\u5728\u7684\u9875\u9762\u76D1\u542C\u5668");
    }
    const debouncedApplyCustomizations = debounce(() => {
      logger_default.info("\u5E94\u7528UI\u5B9A\u5236...");
      if (isVideoPage()) {
        logger_default.info("\u68C0\u6D4B\u5230\u77ED\u89C6\u9891\u9875\u9762\uFF0C\u5E94\u7528\u89C6\u9891\u5B9A\u5236");
        uiManager2.applyVideoCustomizations();
      }
      if (isLivePage()) {
        logger_default.info("\u68C0\u6D4B\u5230\u76F4\u64AD\u95F4\u9875\u9762\uFF0C\u5E94\u7528\u76F4\u64AD\u5B9A\u5236");
        uiManager2.applyLiveCustomizations();
      }
    }, 300);
    mutationObserver = new MutationObserver((mutations) => {
      let hasSignificantChange = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const addedElements = Array.from(mutation.addedNodes).filter((node) => node.nodeType === 1);
          for (const element of addedElements) {
            const el = element;
            if (el.querySelector('[class*="video"],[class*="content"],[class*="main"],[id*="video"]') || el.className && (el.className.includes("video") || el.className.includes("content") || el.className.includes("main"))) {
              hasSignificantChange = true;
              break;
            }
          }
        }
        if (hasSignificantChange) break;
      }
      if (hasSignificantChange) {
        debouncedApplyCustomizations();
      }
    });
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    const initialApplyDelay = [500, 2e3, 5e3];
    initialApplyDelay.forEach((delay, index) => {
      setTimeout(() => {
        logger_default.info(`\u521D\u59CB\u5E94\u7528UI\u5B9A\u5236 (\u5C1D\u8BD5 ${index + 1}/${initialApplyDelay.length})`);
        if (isVideoPage()) {
          uiManager2.applyVideoCustomizations();
        }
        if (isLivePage()) {
          uiManager2.applyLiveCustomizations();
        }
      }, delay);
    });
  }
  function stopObserving() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  }

  // src/main.ts
  var CURRENT_VERSION = "2.0.3";
  var UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1e3;
  var storage = new NamespacedStorage("douyin_tool");
  var uiManager = null;
  function checkForUpdates(showNoUpdateMessage = false) {
    try {
      const updateUrl = "https://github.com/SutChan/douyin_tool/raw/main/dist/douyin_ui_customizer.user.js";
      if (typeof GM_xmlhttpRequest !== "undefined") {
        GM_xmlhttpRequest({
          method: "GET",
          url: updateUrl,
          onload: function(response) {
            if (response.status === 200) {
              const scriptContent = response.responseText;
              const versionMatch = scriptContent.match(/@version\s+(\d+\.\d+\.\d+)/i);
              if (versionMatch && versionMatch[1]) {
                const latestVersion = versionMatch[1];
                if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                  if (confirm(`\u53D1\u73B0\u65B0\u7248\u672C ${latestVersion}\uFF01\u662F\u5426\u66F4\u65B0\u811A\u672C\uFF1F

\u5F53\u524D\u7248\u672C\uFF1A${CURRENT_VERSION}`)) {
                    window.open(updateUrl, "_blank");
                  }
                } else if (showNoUpdateMessage) {
                  alert("\u60A8\u7684\u811A\u672C\u5DF2\u662F\u6700\u65B0\u7248\u672C\uFF01");
                }
              }
            }
          },
          onerror: function() {
            if (showNoUpdateMessage) {
              alert("\u68C0\u67E5\u66F4\u65B0\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
            }
          }
        });
      }
    } catch (error) {
      logger_default.error("\u68C0\u67E5\u66F4\u65B0\u65F6\u53D1\u751F\u9519\u8BEF\uFF1A", error);
    }
  }
  function isNewerVersion(newVersion, currentVersion) {
    const newParts = newVersion.split(".").map(Number);
    const currentParts = currentVersion.split(".").map(Number);
    for (let i = 0; i < newParts.length; i++) {
      if (newParts[i] > currentParts[i]) return true;
      if (newParts[i] < currentParts[i]) return false;
    }
    return false;
  }
  function shouldCheckForUpdates() {
    const lastCheckTime = getItem("lastUpdateCheckTime", 0) || 0;
    const now = Date.now();
    if (now - lastCheckTime > UPDATE_CHECK_INTERVAL) {
      setItem("lastUpdateCheckTime", now);
      return true;
    }
    return false;
  }
  function init() {
    logger_default.info("\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177\u5DF2\u542F\u52A8");
    performance_default.startMonitoring();
    config_default.loadConfig();
    const config = config_default.getConfig();
    uiManager = new ui_manager_default(config);
    uiManager.init();
    theme_default.init();
    injectBasicStyles();
    injectStyles(theme_default, config);
    observePageChanges(uiManager);
    createFloatingSettingsButton(uiManager);
    if (shouldCheckForUpdates()) {
      checkForUpdates(false);
    }
    setupErrorHandling();
    eventEmitter_default.emit("tool.init.completed", { config });
  }
  function createFloatingSettingsButton(uiManager2) {
    if (document.getElementById("douyin-ui-customizer-float-btn")) {
      return;
    }
    const floatButton = document.createElement("div");
    floatButton.id = "douyin-ui-customizer-float-btn";
    floatButton.innerHTML = "\u2699\uFE0F";
    floatButton.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    background: #000000;
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  `;
    floatButton.addEventListener("click", () => {
      uiManager2.showSettingsPanel();
    });
    floatButton.addEventListener("mouseenter", () => {
      floatButton.style.transform = "scale(1.1)";
    });
    floatButton.addEventListener("mouseleave", () => {
      floatButton.style.transform = "scale(1)";
    });
    document.body.appendChild(floatButton);
    setInterval(() => {
      if (!document.getElementById("douyin-ui-customizer-float-btn")) {
        createFloatingSettingsButton(uiManager2);
      }
    }, 5e3);
  }
  var globalUIManager = null;
  function initUIManager() {
    if (!globalUIManager) {
      const config = config_default.getConfig();
      globalUIManager = new ui_manager_default(config);
    }
    return globalUIManager;
  }
  if (typeof GM_registerMenuCommand !== "undefined") {
    GM_registerMenuCommand("\u6253\u5F00\u8BBE\u7F6E\u9762\u677F", () => {
      const uiManager2 = initUIManager();
      uiManager2.showSettingsPanel();
    });
    GM_registerMenuCommand("\u5207\u6362\u6697\u9ED1\u6A21\u5F0F", async () => {
      try {
        const config = config_default.getConfig();
        const newTheme = config.theme === "dark" ? "light" : "dark";
        config_default.setConfig("theme", newTheme);
        await theme_default.applyTheme(newTheme);
        logger_default.info(`\u4E3B\u9898\u5DF2\u5207\u6362\u4E3A: ${newTheme}`);
      } catch (error) {
        logger_default.error("\u5207\u6362\u4E3B\u9898\u5931\u8D25:", error);
      }
    });
    GM_registerMenuCommand("\u68C0\u67E5\u66F4\u65B0", () => {
      checkForUpdates(true);
    });
    GM_registerMenuCommand("\u91CD\u7F6E\u6240\u6709\u8BBE\u7F6E", () => {
      if (confirm("\u786E\u5B9A\u8981\u91CD\u7F6E\u6240\u6709\u8BBE\u7F6E\u5417\uFF1F")) {
        config_default.resetConfig();
        location.reload();
      }
    });
  }
  function setupErrorHandling() {
    window.onerror = function(message, source, lineno, colno, error) {
      logger_default.error("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u5168\u5C40\u9519\u8BEF:", { message, source, lineno, colno, error });
      eventEmitter_default.emit("tool.error", { type: "global", error, message });
      return true;
    };
    window.addEventListener("unhandledrejection", function(event) {
      logger_default.error("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u672A\u5904\u7406\u7684Promise\u9519\u8BEF:", event.reason);
      eventEmitter_default.emit("tool.error", { type: "promise", error: event.reason });
    });
    window.addEventListener("error", (event) => {
      logger_default.error("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u6355\u83B7\u5230\u9519\u8BEF:", event.error, event.message);
      eventEmitter_default.emit("tool.error", { type: "window", error: event.error, message: event.message });
    });
    performance_default.watchPerformance((data) => {
      logger_default.warn("\u6027\u80FD\u8B66\u544A:", data);
    });
  }
  function cleanup() {
    logger_default.info("\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177\u6267\u884C\u6E05\u7406");
    try {
      if (uiManager && typeof uiManager.cleanup === "function") {
        uiManager.cleanup();
      }
      performance_default.stopMonitoring();
      stopObserving();
      eventEmitter_default.off("tool.init.completed");
      eventEmitter_default.off("tool.styles.updated");
      eventEmitter_default.off("tool.error");
      eventEmitter_default.off("performance.warning");
      eventEmitter_default.emit("tool.cleanup.completed");
    } catch (error) {
      logger_default.error("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u6E05\u7406\u5931\u8D25:", error);
    }
  }
  function ensureInit() {
    try {
      init();
    } catch (error) {
      logger_default.error("\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u5C06\u91CD\u8BD5:", error);
      setTimeout(init, 500);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureInit);
  }
  if (document.readyState !== "loading") {
    setTimeout(ensureInit, 0);
  }
  setTimeout(ensureInit, 1e3);
  var lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      logger_default.info("\u68C0\u6D4B\u5230\u9875\u9762URL\u53D8\u5316\uFF0C\u91CD\u65B0\u5E94\u7528UI\u5B9A\u5236");
      ensureInit();
    }
  }, 1e3);
  window.addEventListener("unload", cleanup);
  var douyinUICustomizer = Object.freeze({
    version: CURRENT_VERSION,
    getConfig: () => config_default.getConfig(),
    setConfig: (key, value) => config_default.setConfig(key, value),
    showDebugInfo: () => {
      logger_default.debug("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u8C03\u8BD5\u4FE1\u606F:", {
        version: CURRENT_VERSION,
        config: config_default.getConfig(),
        page: {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState
        },
        performance: performance_default.getMetrics()
      });
    },
    refresh: () => {
      if (uiManager && typeof uiManager.applyVideoCustomizations === "function" && typeof uiManager.applyLiveCustomizations === "function") {
        if (isVideoPage()) {
          uiManager.applyVideoCustomizations();
        }
        if (isLivePage()) {
          uiManager.applyLiveCustomizations();
        }
      }
    },
    cleanup,
    theme: Object.freeze({
      apply: (themeName) => theme_default.applyTheme(themeName),
      getCurrent: () => theme_default.getCurrentTheme(),
      list: () => theme_default.listThemes()
    }),
    on: (event, callback) => eventEmitter_default.on(event, callback),
    off: (event, callback) => eventEmitter_default.off(event, callback),
    emit: (event, data) => eventEmitter_default.emit(event, data),
    performance: Object.freeze({
      start: () => performance_default.startMonitoring(),
      stop: () => performance_default.stopMonitoring(),
      getStats: () => performance_default.getMetrics(),
      enableDebug: () => {
      }
    }),
    config: Object.freeze({
      export: () => config_default.exportConfig(),
      import: (jsonString) => config_default.importConfig(jsonString),
      reset: () => config_default.resetConfig(),
      validate: (config) => config_default.validateConfig(config)
    })
  });
  Object.defineProperty(window, "douyinUICustomizer", {
    value: douyinUICustomizer,
    writable: false,
    configurable: false,
    enumerable: true
  });
  logger_default.info("[\u6296\u97F3UI\u5B9A\u5236\u5DE5\u5177] \u521D\u59CB\u5316\u5B8C\u6210\uFF0C\u5F53\u524D\u7248\u672C:", CURRENT_VERSION);
  eventEmitter_default.on("tool.error", (data) => {
    logger_default.error("\u5DE5\u5177\u9519\u8BEF\u4E8B\u4EF6:", data);
  });
  eventEmitter_default.on("tool.styles.updated", (data) => {
    logger_default.info("\u6837\u5F0F\u5DF2\u66F4\u65B0:", data);
  });
})();
