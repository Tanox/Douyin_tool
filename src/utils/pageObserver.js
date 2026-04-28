// src/utils/pageObserver.ts - 页面变化监听工具（TypeScript迁移中）

import { debounce } from './dom.js';
import logger from './logger.js';

let mutationObserver = null;

export function isVideoPage() {
  return location.pathname.includes('/video/') ||
         location.pathname === '/' ||
         location.pathname.includes('/user/');
}

export function isLivePage() {
  return location.pathname.includes('/live/');
}

export function observePageChanges(uiManager) {
  logger.info('开始监听页面变化...');

  const debouncedApplyCustomizations = debounce(() => {
    logger.info('应用UI定制...');
    if (isVideoPage()) {
      logger.info('检测到短视频页面，应用视频定制');
      uiManager.applyVideoCustomizations();
    }
    if (isLivePage()) {
      logger.info('检测到直播间页面，应用直播定制');
      uiManager.applyLiveCustomizations();
    }
  }, 300);

  mutationObserver = new MutationObserver((mutations) => {
    let hasSignificantChange = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const addedElements = Array.from(mutation.addedNodes).filter(node => node.nodeType === 1);
        for (const element of addedElements) {
          if (element.querySelector('[class*="video"],[class*="content"],[class*="main"],[id*="video"]') ||
              element.className && (element.className.includes('video') ||
                                   element.className.includes('content') ||
                                   element.className.includes('main'))) {
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

  const initialApplyDelay = [500, 2000, 5000];
  initialApplyDelay.forEach((delay, index) => {
    setTimeout(() => {
      logger.info(`初始应用UI定制 (尝试 ${index + 1}/${initialApplyDelay.length})`);
      if (isVideoPage()) {
        uiManager.applyVideoCustomizations();
      }
      if (isLivePage()) {
        uiManager.applyLiveCustomizations();
      }
    }, delay);
  });
}

export function stopObserving() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

export function getMutationObserver() {
  return mutationObserver;
}
