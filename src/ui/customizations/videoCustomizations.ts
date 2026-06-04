import { findElementsByClassPattern, findElementsByStructure, toggleElements } from '../../utils/dom';
import logger from '../../utils/logger';
import type UIManager from '../../ui_manager';

export function applyVideoCustomizations(uiManager: UIManager): void {
  logger.info('[UI定制] 开始应用短视频界面定制');
  const { videoUI } = uiManager.config;

  if (!videoUI) {
    logger.warn('[UI定制] 警告：videoUI配置缺失');
    return;
  }

  logger.info('[UI定制] 视频UI配置:', JSON.stringify(videoUI));

  if (!document.body) {
    logger.warn('[UI定制] 警告：document.body未准备好，延迟应用定制');
    setTimeout(() => uiManager.applyVideoCustomizations(), 500);
    return;
  }

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 查找点赞按钮元素...');
    const heartIcons = uiManager.findElementsByStructure({
      tagName: 'svg',
      attributes: { viewBox: '0 0 1024 1024' }
    });
    if (heartIcons.length > 0) {
      logger.info(`[UI定制] 找到 ${heartIcons.length} 个可能的点赞图标`);
      const elements = heartIcons.map(icon => icon.closest('div') || icon);
      logger.info(`[UI定制] 获取到 ${elements.length} 个点赞相关元素`);
      return elements;
    }

    logger.info('[UI定制] 尝试通过类名模式匹配点赞按钮');
    const classElements = uiManager.findElementsByClassPattern(/like|heart|favorite/i);
    logger.info(`[UI定制] 通过类名找到 ${classElements.length} 个可能的点赞元素`);
    return classElements;
  }, videoUI.showLikeButton);

  uiManager.toggleElement(() => {
    logger.info('[UI定制] 开始查找评论元素...');
    const commentElements = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'svg', attributes: { viewBox: '0 0 1024 1024' } }]
    });
    if (commentElements.length > 0) return commentElements;
    return uiManager.findElementsByClassPattern(/comment|discuss/i);
  }, videoUI.showCommentButton);

  uiManager.toggleElement(() => {
    const shareElements = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'svg', attributes: { viewBox: '0 0 1024 1024' } }]
    });
    if (shareElements.length > 0) {
      return shareElements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('share') || text.includes('分享');
      });
    } else {
      return uiManager.findElementsByClassPattern(/share|forward/i);
    }
  }, videoUI.showShareButton);

  uiManager.toggleElement(() => {
    const avatarElements = uiManager.findElementsByStructure({
      tagName: 'img',
      attributes: { class: /avatar|user/i }
    });
    if (avatarElements.length > 0) {
      return avatarElements.map(img => img.closest('div') || img);
    }
    return uiManager.findElementsByClassPattern(/author|user|avatar/i);
  }, videoUI.showAuthorInfo);

  uiManager.toggleElement(() => {
    const musicElements = uiManager.findElementsByStructure({ text: '音乐' });
    if (musicElements.length > 0) {
      return musicElements.map(el => el.closest('div') || el);
    }
    return uiManager.findElementsByClassPattern(/music|sound/i);
  }, videoUI.showMusicInfo);

  uiManager.toggleElement(() => {
    const textElements = document.body.querySelectorAll('div');
    const descriptions = Array.from(textElements).filter(el => {
      return el.textContent.length > 20 && el.textContent.length < 200 &&
             el.querySelector('img') && el.querySelector('video');
    });
    if (descriptions.length > 0) return descriptions;
    return uiManager.findElementsByClassPattern(/desc|description|content/i);
  }, videoUI.showDescription);

  uiManager.toggleElement(() => {
    const recommendationContainers = uiManager.findElementsByStructure({
      tagName: 'div',
      children: [{ tagName: 'video' }]
    });
    if (recommendationContainers.length > 0) return recommendationContainers;
    return uiManager.findElementsByClassPattern(/recommend|suggest|related/i);
  }, videoUI.showRecommendations);

  if (videoUI.controlBar) {
    uiManager.customizeControlBar(videoUI.controlBar);
  }

  uiManager.applyLayout('video', videoUI.layout);
}