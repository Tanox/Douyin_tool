/**
 * src/utils/pageObserver.ts v0.1.2
 * 页面洞察模块 - 负责页面变化监听与类型检测
 */
import { debounce } from './dom';
import logger from './logger';
import type UIManager from '../ui_manager';

// ============== 类型定义 ==============

/** 页面类型枚举 */
export enum PageType {
  VIDEO = 'video',
  LIVE = 'live',
  UNKNOWN = 'unknown'
}

/** 页面变化回调函数类型 */
type PageChangeCallback = () => void;

/** 观察器配置 */
interface ObserverConfig {
  /** 防抖延迟时间（毫秒） */
  debounceDelay: number;
  /** 初始应用延迟时间数组（毫秒） */
  initialApplyDelay: number[];
  /** 是否启用性能监控 */
  enablePerformanceMonitor: boolean;
}

// ============== 配置常量 ==============

const DEFAULT_CONFIG: ObserverConfig = {
  debounceDelay: 300,
  initialApplyDelay: [500, 2000, 5000],
  enablePerformanceMonitor: false
};

// ============== 页面类型检测 ==============

/**
 * 检测当前页面是否为视频页面
 * @returns 是否为视频页面
 */
export function isVideoPage(): boolean {
  const path = location.pathname;
  return path.includes('/video/') ||
         path === '/' ||
         path.includes('/user/');
}

/**
 * 检测当前页面是否为直播间页面
 * @returns 是否为直播间页面
 */
export function isLivePage(): boolean {
  return location.pathname.includes('/live/');
}

/**
 * 获取当前页面类型
 * @returns 页面类型枚举
 */
export function getCurrentPageType(): PageType {
  if (isVideoPage()) return PageType.VIDEO;
  if (isLivePage()) return PageType.LIVE;
  return PageType.UNKNOWN;
}

// ============== 元素检测工具 ==============

/** 视频相关选择器 */
const VIDEO_RELATED_SELECTORS = [
  '[class*="video"]',
  '[class*="content"]',
  '[class*="main"]',
  '[id*="video"]'
];

/**
 * 检测元素是否与视频相关
 * @param element - 待检测的 DOM 元素
 * @returns 是否与视频相关
 */
function isVideoRelatedElement(element: Element): boolean {
  const className = (element as HTMLElement).className;
  if (!className || typeof className !== 'string') return false;

  return VIDEO_RELATED_SELECTORS.some(selector => {
    try {
      return element.matches(selector) || className.includes(selector.replace(/[\[\]=*"]/g, ''));
    } catch {
      return false;
    }
  });
}

/**
 * 从节点列表中筛选相关元素
 * @param nodes - DOM 节点列表
 * @returns 是否包含相关元素
 */
function hasRelevantNodes(nodes: NodeList): boolean {
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    const element = node as Element;
    if (isVideoRelatedElement(element)) return true;
  }
  return false;
}

// ============== 观察器实现 ==============

let mutationObserver: MutationObserver | null = null;
let observerConfig: ObserverConfig = { ...DEFAULT_CONFIG };

/**
 * 检查是否有显著的变化
 * @param mutations - MutationRecord 数组
 * @returns 是否有显著变化
 */
function hasSignificantChanges(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0 && hasRelevantNodes(mutation.addedNodes)) {
      return true;
    }
  }
  return false;
}

/**
 * 执行页面定制
 * @param uiManager - UI 管理器实例
 */
function applyCustomizations(uiManager: UIManager): void {
  const pageType = getCurrentPageType();

  switch (pageType) {
    case PageType.VIDEO:
      logger.info('检测到短视频页面，应用视频定制');
      uiManager.applyVideoCustomizations();
      break;
    case PageType.LIVE:
      logger.info('检测到直播间页面，应用直播定制');
      uiManager.applyLiveCustomizations();
      break;
    default:
      logger.debug('未知页面类型，跳过定制');
  }
}

/**
 * 执行初始应用（带重试机制）
 * @param uiManager - UI 管理器实例
 */
function applyInitialWithRetry(uiManager: UIManager): void {
  const delays = observerConfig.initialApplyDelay;

  delays.forEach((delay, index) => {
    setTimeout(() => {
      try {
        applyCustomizations(uiManager);
      } catch (error) {
        logger.error(`初始应用UI定制失败 (尝试 ${index + 1}/${delays.length}):`, error);
      }
    }, delay);
  });
}

/**
 * 创建页面变化处理器
 * @param uiManager - UI 管理器实例
 * @returns 防抖后的处理函数
 */
function createChangeHandler(uiManager: UIManager): PageChangeCallback {
  return debounce(() => {
    logger.info('检测到页面变化，应用UI定制');
    applyCustomizations(uiManager);
  }, observerConfig.debounceDelay);
}

/**
 * 启动页面观察
 * @param uiManager - UI 管理器实例
 */
export function observePageChanges(uiManager: UIManager): void {
  logger.info('开始监听页面变化...');

  const changeHandler = createChangeHandler(uiManager);

  try {
    mutationObserver = new MutationObserver((mutations) => {
      if (hasSignificantChanges(mutations)) {
        changeHandler();
      }
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    applyInitialWithRetry(uiManager);
  } catch (error) {
    logger.error('启动页面观察失败:', error);
  }
}

/**
 * 停止页面观察
 */
export function stopObserving(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
    logger.info('页面观察已停止');
  }
}

/**
 * 获取当前观察器实例
 * @returns MutationObserver 实例或 null
 */
export function getMutationObserver(): MutationObserver | null {
  return mutationObserver;
}

/**
 * 更新观察器配置
 * @param config - 新配置（部分更新）
 */
export function updateObserverConfig(config: Partial<ObserverConfig>): void {
  observerConfig = { ...observerConfig, ...config };
}

/**
 * 获取当前观察器配置
 * @returns 当前配置副本
 */
export function getObserverConfig(): Readonly<ObserverConfig> {
  return { ...observerConfig };
}
