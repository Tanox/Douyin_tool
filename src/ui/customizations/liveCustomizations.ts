import { findElementsByClassPattern, findElementsByStructure } from '../../utils/dom';
import logger from '../../utils/logger';
import type UIManager from '../../ui_manager';

export function applyLiveCustomizations(uiManager: UIManager): void {
  logger.info('应用直播间界面定制');
  const { liveUI } = uiManager.config;

  if (!liveUI) return;

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 开始查找礼物元素...');
    let giftElements: HTMLElement[] = [];

    giftElements = giftElements.concat(
      uiManager.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
    );

    giftElements = giftElements.concat(
      uiManager.findElementsByStructure({
        attributes: { class: /gift|present|reward|award|effect|animation/i }
      })
    );

    const potentialGiftAnims = uiManager.findElementsByClassPattern(/^(gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送)/i).filter(el => {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex) || 0;
      return (style.animationName !== 'none' ||
        style.transitionProperty.includes('transform') ||
        style.transform !== 'none') &&
        zIndex > 100 &&
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
    const bulletElements = uiManager.findElementsByClassPattern(/danmu|bullet|danmaku|弹幕/i);
    const potentialBullets = bulletElements.filter(el => {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex) || 0;
      return style.position === 'absolute' &&
             style.pointerEvents === 'none' &&
             zIndex > 0;
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
    const numberElements = uiManager.findElementsByClassPattern(/stat|count|number|view|统计|数字|数量/i);
    const potentialStats = numberElements.filter(el => {
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