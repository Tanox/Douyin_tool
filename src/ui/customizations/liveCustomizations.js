// src/ui/customizations/liveCustomizations.js

import { findElementsByClassPattern, findElementsByStructure } from '../../utils/dom.js';
import logger from '../../utils/logger.js';

export function applyLiveCustomizations(uiManager) {
  logger.info('应用直播间界面定制');
  const { liveUI } = uiManager.config;

  if (!liveUI) return;

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 开始查找礼物元素...');
    let giftElements = [];

    giftElements = giftElements.concat(
      uiManager.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
    );

    giftElements = giftElements.concat(
      uiManager.findElementsByStructure({
        attributes: { class: /gift|present|reward|award|effect|animation/i }
      })
    );

    const animatedElements = document.body.querySelectorAll('div');
    const potentialGiftAnims = Array.from(animatedElements).filter(el => {
      const style = window.getComputedStyle(el);
      return (style.animationName !== 'none' ||
        style.transitionProperty.includes('transform') ||
        style.transform !== 'none') &&
        parseInt(style.zIndex) > 100 &&
        style.position === 'absolute';
    });

    giftElements = giftElements.concat(potentialGiftAnims);

    const textGiftElements = uiManager.findElementsByStructure({
      text: /礼物|特效|打赏|赠送|连击|连击奖励|豪华礼物/i
    });

    if (textGiftElements.length > 0) {
      textGiftElements.forEach(el => {
        giftElements.push(el);
        giftElements.push(el.closest('div') || el);
        giftElements.push(el.closest('.gift-container') || el);
        giftElements.push(el.closest('.animation-container') || el);
      });
    }

    giftElements = [...new Set(giftElements)];
    logger.info(`[UI定制] 找到 ${giftElements.length} 个礼物相关元素`);
    return giftElements;
  }, liveUI.showGifts);

  uiManager.toggleElement(() => {
    const bulletElements = document.body.querySelectorAll('div');
    const potentialBullets = Array.from(bulletElements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'absolute' &&
             style.pointerEvents === 'none' &&
             style.zIndex > 0;
    });
    if (potentialBullets.length > 0) return potentialBullets;
    return uiManager.findElementsByClassPattern(/danmu|bullet|comment|danmaku/i);
  }, liveUI.showDanmaku);

  uiManager.toggleElement(() => {
    const recommendationContainers = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'img' }]
    });
    if (recommendationContainers.length > 0) return recommendationContainers;
    return uiManager.findElementsByClassPattern(/recommend|suggest|related|live-recommend/i);
  }, liveUI.showRecommendations);

  uiManager.toggleElement(() => {
    const adElements = uiManager.findElementsByStructure({ text: /广告|推广|ad|promotion/i });
    if (adElements.length > 0) {
      return adElements.map(el => el.closest('div') || el);
    }
    return uiManager.findElementsByClassPattern(/ad|advertisement|promotion|广告/i);
  }, liveUI.showAds);

  uiManager.toggleElement(() => {
    const numberElements = document.body.querySelectorAll('div');
    const potentialStats = Array.from(numberElements).filter(el => {
      return /\d+/.test(el.textContent);
    });
    if (potentialStats.length > 0) return potentialStats;
    return uiManager.findElementsByClassPattern(/stat|count|number|view/i);
  }, liveUI.showStats);

  if (liveUI.danmaku) {
    uiManager.customizeDanmaku(liveUI.danmaku);
  }

  uiManager.applyLayout('live', liveUI.layout);
}
