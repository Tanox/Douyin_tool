// src/utils/styleGenerator.ts - 样式生成工具（TypeScript迁移中）

import { injectStyle } from './dom.js';
import logger from './logger.js';
import eventEmitter from './eventEmitter.js';

export function generateCustomStyles(config) {
  let customCSS = '';

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
      customCSS += '.like-button { display: none !important; }';
    }
    if (!config.videoUI.showCommentButton) {
      customCSS += '.comment-button { display: none !important; }';
    }
    if (!config.videoUI.showShareButton) {
      customCSS += '.share-button { display: none !important; }';
    }
    if (!config.videoUI.showAuthorInfo) {
      customCSS += '.author-info { display: none !important; }';
    }
    if (!config.videoUI.showMusicInfo) {
      customCSS += '.music-info, .music-label, .sound-info { display: none !important; }';
    }
    if (!config.videoUI.showDescription) {
      customCSS += '.video-desc, .description, .video-content { display: none !important; }';
    }
    if (config.videoUI.layout) {}
  }

  if (config.liveUI) {
    if (!config.liveUI.showGifts) {
      customCSS += `
        .gift-animation, .gift-container, .gift-effect, .gift-display,
        .present-animation, .reward-container, .award-animation,
        .animation-container, .live-gift, .live-gift-animation,
        [class*="gift"], [class*="present"], [class*="reward"],
        [class*="award"], [class*="effect"], [class*="animation"],
        [class*="特效"], [class*="礼物"], [class*="打赏"],
        [class*="连击"], [class*="豪华礼物"], [class*="礼物特效"],
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
      customCSS += '.live-recommendations, .live-ads { display: none !important; }';
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

export async function injectStyles(themeManager, config) {
  try {
    const success = await themeManager.applyTheme(config.theme);
    if (!success) {
      logger.warn('主题应用失败，使用备用样式注入');

      const oldStyle = document.getElementById('douyin-ui-customizer-styles');
      if (oldStyle) {
        oldStyle.remove();
      }

      const styleElement = document.createElement('style');
      styleElement.id = 'douyin-ui-customizer-styles';
      styleElement.textContent = '';
      document.head.appendChild(styleElement);
    }

    const customStyle = document.createElement('style');
    customStyle.id = 'douyin-ui-customizer-custom';
    customStyle.textContent = generateCustomStyles(config);
    document.head.appendChild(customStyle);

    eventEmitter.emit('tool.styles.updated', { theme: config.theme });
  } catch (error) {
    logger.error('注入样式失败:', error);
  }
}

export function injectBasicStyles() {
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
