import { getItem, setItem, getNestedItem, setNestedItem, NamespacedStorage } from './utils/storage.ts';
import logger from './utils/logger.ts';
import eventEmitter from './utils/eventEmitter.ts';

const configStorage = new NamespacedStorage('douyin_tool_config');

const CONFIG_KEY = 'main';
const CONFIG_VERSION = '2.0.3';

interface DanmakuConfig {
  fontSize: number;
  color: string;
  opacity: number;
  speed: string;
  position: string;
  maxLines: number;
}

interface ControlBarConfig {
  show: boolean;
  autoHide: boolean;
  position: string;
  size: string;
  opacity: number;
}

interface PlaybackConfig {
  defaultQuality: string;
  autoPlay: boolean;
  loop: boolean;
}

interface VideoUIConfig {
  showLikeButton: boolean;
  showCommentButton: boolean;
  showShareButton: boolean;
  showAuthorInfo: boolean;
  showMusicInfo: boolean;
  showDescription: boolean;
  showRecommendations: boolean;
  layout: string;
  controlBar: ControlBarConfig;
  playback: PlaybackConfig;
}

interface LiveUIConfig {
  showGifts: boolean;
  showDanmaku: boolean;
  showRecommendations: boolean;
  showAds: boolean;
  showStats: boolean;
  danmaku: DanmakuConfig;
  layout: string;
  volume: number;
}

interface GeneralConfig {
  autoPlay: boolean;
  autoScroll: boolean;
  keyboardShortcuts: boolean;
  notifications: boolean;
  language: string;
  animations: boolean;
  updateCheck: boolean;
}

interface AdvancedConfig {
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  customScripts: string[];
}

export interface Config {
  version: string;
  theme: string;
  videoUI: VideoUIConfig;
  liveUI: LiveUIConfig;
  general: GeneralConfig;
  advanced: AdvancedConfig;
  [key: string]: unknown;
}

const DEFAULT_CONFIG: Config = {
  version: CONFIG_VERSION,
  theme: 'light',

  videoUI: {
    showLikeButton: true,
    showCommentButton: true,
    showShareButton: true,
    showAuthorInfo: true,
    showMusicInfo: true,
    showDescription: true,
    showRecommendations: true,
    layout: 'default',
    controlBar: {
      show: true,
      autoHide: true,
      position: 'bottom',
      size: 'medium',
      opacity: 0.9
    },
    playback: {
      defaultQuality: 'auto',
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
      color: '#FFFFFF',
      opacity: 0.8,
      speed: 'medium',
      position: 'top',
      maxLines: 5
    },
    layout: 'default',
    volume: 100
  },

  general: {
    autoPlay: true,
    autoScroll: false,
    keyboardShortcuts: true,
    notifications: false,
    language: 'zh-CN',
    animations: true,
    updateCheck: true
  },

  advanced: {
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    customScripts: []
  }
};

let currentConfig: Config | null = null;

export function loadConfig(): Config {
  try {
    const savedConfig = configStorage.getItem(CONFIG_KEY);

    if (savedConfig) {
      logger.info('[抖音工具] 加载已保存的配置');
      const loadedConfig = migrateConfig(savedConfig as Config);
      currentConfig = mergeConfig(loadedConfig, DEFAULT_CONFIG);
      currentConfig.version = CONFIG_VERSION;
    } else {
      logger.info('[抖音工具] 使用默认配置');
      currentConfig = { ...DEFAULT_CONFIG };
    }

    saveConfig(currentConfig);

    return currentConfig;
  } catch (error) {
    logger.error('[抖音工具] 加载配置失败：', error);
    eventEmitter.emit('config.error', { type: 'load', error });
    currentConfig = { ...DEFAULT_CONFIG };
    return currentConfig;
  }
}

export function getConfig(): Config {
  if (!currentConfig) {
    loadConfig();
  }
  return { ...currentConfig! };
}

export function setConfig(key: string | Partial<Config>, value?: unknown): boolean {
  try {
    if (!currentConfig) {
      loadConfig();
    }

    if (typeof key === 'object') {
      currentConfig = mergeConfig(key, currentConfig!);
    } else {
      if (key.includes('.')) {
        setNestedConfig(key, value);
      } else {
        (currentConfig as Record<string, unknown>)[key] = value;
      }
    }

    currentConfig!.version = CONFIG_VERSION;

    saveConfig(currentConfig!);

    return true;
  } catch (error) {
    logger.error('[抖音工具] 设置配置失败：', error);
    eventEmitter.emit('config.error', { type: 'set', error, key, value });
    return false;
  }
}

function setNestedConfig(path: string, value: unknown): void {
  const keys = path.split('.');
  let obj: Record<string, unknown> = currentConfig as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!obj[key] || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    obj = obj[key] as Record<string, unknown>;
  }

  obj[keys[keys.length - 1]] = value;
}

export function getConfigValue<T = unknown>(path: string, defaultValue?: T): T {
  if (!currentConfig) {
    loadConfig();
  }

  if (path.includes('.')) {
    return getNestedItemFromConfig(path, defaultValue) as T;
  }

  const value = (currentConfig as Record<string, unknown>)[path];
  return value !== undefined ? (value as T) : defaultValue as T;
}

function getNestedItemFromConfig(path: string, defaultValue: unknown): unknown {
  const keys = path.split('.');
  let obj: Record<string, unknown> = currentConfig as Record<string, unknown>;

  for (const key of keys) {
    if (obj === null || obj === undefined || typeof obj !== 'object' || !(key in obj)) {
      return defaultValue;
    }
    obj = obj[key] as Record<string, unknown>;
  }

  return obj;
}

export function saveConfig(config: Config): boolean {
  try {
    configStorage.setItem(CONFIG_KEY, config);
    logger.info('[抖音工具] 配置已保存');
    eventEmitter.emit('config.saved', { config });
    return true;
  } catch (error) {
    logger.error('[抖音工具] 保存配置失败：', error);
    eventEmitter.emit('config.error', { type: 'save', error });
    return false;
  }
}

export function resetConfig(): Config {
  try {
    currentConfig = { ...DEFAULT_CONFIG };
    configStorage.setItem(CONFIG_KEY, currentConfig);
    logger.info('[抖音工具] 配置已重置为默认值');
    eventEmitter.emit('config.reset', { config: currentConfig });
    return currentConfig;
  } catch (error) {
    logger.error('[抖音工具] 重置配置失败：', error);
    eventEmitter.emit('config.error', { type: 'reset', error });
    return { ...DEFAULT_CONFIG };
  }
}

function mergeConfig(userConfig: Partial<Config>, defaultConfig: Config): Config {
  const merged = { ...defaultConfig };

  for (const key in userConfig) {
    if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
      const userValue = userConfig[key];
      const defaultVal = defaultConfig[key];
      
      if (typeof userValue === 'object' && userValue !== null &&
        typeof defaultVal === 'object' && defaultVal !== null &&
        !Array.isArray(userValue) && !Array.isArray(defaultVal)) {
        merged[key] = mergeConfig(
          userValue as Partial<Config>,
          defaultVal as Config
        );
      } else {
        merged[key] = userValue;
      }
    }
  }

  return merged;
}

function migrateConfig(oldConfig: Config): Config {
  if (!oldConfig.version || oldConfig.version !== CONFIG_VERSION) {
    logger.info(`[抖音工具] 执行配置迁移: ${oldConfig.version || 'unknown'} -> ${CONFIG_VERSION}`);
    eventEmitter.emit('config.migrating', {
      fromVersion: oldConfig.version || 'unknown',
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

export function exportConfig(): string {
  const config = getConfig();
  try {
    const result = JSON.stringify(config, null, 2);
    logger.info('[抖音工具] 配置导出成功');
    return result;
  } catch (error) {
    logger.error('[抖音工具] 导出配置失败：', error);
    eventEmitter.emit('config.error', { type: 'export', error });
    return '{}';
  }
}

export function importConfig(jsonString: string): boolean {
  try {
    const config = JSON.parse(jsonString);

    if (typeof config !== 'object' || config === null) {
      throw new Error('配置格式无效');
    }

    currentConfig = mergeConfig(config as Partial<Config>, DEFAULT_CONFIG);
    currentConfig.version = CONFIG_VERSION;
    saveConfig(currentConfig);

    logger.info('[抖音工具] 配置导入成功');
    eventEmitter.emit('config.imported', { config: currentConfig });
    return true;
  } catch (error) {
    logger.error('[抖音工具] 导入配置失败：', error);
    eventEmitter.emit('config.error', { type: 'import', error });
    return false;
  }
}

export function validateConfig(config: Partial<Config>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  try {
    if (config.theme && !['light', 'dark'].includes(config.theme)) {
      issues.push('主题配置无效，应为 light 或 dark');
    }

    if (config.videoUI?.layout && !['default', 'compact', 'fullscreen'].includes(config.videoUI.layout)) {
      issues.push('视频界面布局配置无效');
    }

    if (config.liveUI?.layout && !['default', 'minimal', 'immersive'].includes(config.liveUI.layout)) {
      issues.push('直播间界面布局配置无效');
    }

    if (config.liveUI?.danmaku?.fontSize && (config.liveUI.danmaku.fontSize < 12 || config.liveUI.danmaku.fontSize > 36)) {
      issues.push('弹幕字体大小应在 12-36 之间');
    }

    if (config.liveUI?.danmaku?.opacity && (config.liveUI.danmaku.opacity < 0.1 || config.liveUI.danmaku.opacity > 1)) {
      issues.push('弹幕透明度应在 0.1-1 之间');
    }

  } catch (error) {
    logger.error('[抖音工具] 验证配置失败：', error);
    eventEmitter.emit('config.error', { type: 'validate', error });
    issues.push('配置验证过程中发生错误');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

const initialized = loadConfig();

eventEmitter.on('config.saved', (data) => {
  logger.debug('[抖音工具] 配置已保存:', data);
});

eventEmitter.on('config.error', (data) => {
  logger.error('[抖音工具] 配置错误:', data);
});

export default {
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

logger.info('[抖音工具] 配置管理器已初始化');
eventEmitter.emit('config.initialized', { config: currentConfig });