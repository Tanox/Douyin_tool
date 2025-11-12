/**
 * UI管理器模块
 * 负责处理界面定制、设置面板和用户界面交互
 */

import {
  debounce,
  throttle,
  getElement,
  getElements,
  findElementsByClassPattern,
  findElementsByStructure,
  toggleElements,
  addClass,
  removeClass,
  addEvent,
  removeEvent,
  createElement,
  injectStyle
} from './utils/dom.js';
import { logger } from './utils/logger.js';
import { eventEmitter } from './utils/eventEmitter.js';
import themeManager from './styles/theme.js';

class UIManager {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.settingsPanel = null;
    this.toggleButton = null;
    this.isPanelVisible = false;
    this.lastScrollPosition = 0;
    
    // 初始化防抖和节流函数
    this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
    this.throttledHandleScroll = throttle((e) => this.handleScroll(e), 100);
    this.mutationObserver = null;
    
    // 初始化日志记录
    logger.info('UIManager initialized with config');
    
    // 监听主题变化事件
    eventEmitter.on('theme.changed', (newTheme) => {
      logger.info(`Theme changed to ${newTheme}`);
      this.applyTheme(newTheme);
    });
  };

  /**
   * 应用短视频界面定制
   */
  applyVideoCustomizations() {
    logger.info('[UI定制] 开始应用短视频界面定制');
    
    if (!this.config.videoUI) {
      logger.warn('[UI定制] 警告：videoUI配置缺失');
      return;
    }
    
    const { videoUI } = this.config;
    logger.info('[UI定制] 视频UI配置:', JSON.stringify(videoUI));
    
    // 确保DOM已准备好
    if (!document.body) {
      logger.warn('[UI定制] 警告：document.body未准备好，延迟应用定制');
      setTimeout(() => this.applyVideoCustomizations(), 500);
      return;
    }
    
    // 隐藏/显示点赞按钮（使用多种策略）
    this.toggleElement(() => {
      logger.info('[UI定制] 查找点赞按钮元素...');
      // 1. 首先尝试通过可能的点赞图标查找
      const heartIcons = this.findElementsByStructure({
        tagName: 'svg',
        attributes: { viewBox: '0 0 1024 1024' }
      });
      
      if (heartIcons.length > 0) {
        logger.info(`[UI定制] 找到 ${heartIcons.length} 个可能的点赞图标`);
        // 找到包含点赞图标的元素，返回其父元素
        const elements = heartIcons.map(icon => icon.closest('div') || icon);
        logger.info(`[UI定制] 获取到 ${elements.length} 个点赞相关元素`);
        return elements;
      }
      
      // 2. 通过类名模式匹配
      logger.info('[UI定制] 尝试通过类名模式匹配点赞按钮');
      const classElements = this.findElementsByClassPattern(/like|heart|favorite/i);
      logger.info(`[UI定制] 通过类名找到 ${classElements.length} 个可能的点赞元素`);
      return classElements;
    }, videoUI.showLikeButton);
    
    // 隐藏/显示评论按钮
    this.toggleElement(() => {
      logger.info('[UI定制] 开始查找评论元素...');
      const commentElements = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'svg',
            attributes: { viewBox: '0 0 1024 1024' }
          }]
      });
      
      if (commentElements.length > 0) {
        return commentElements;
      }
      
      return this.findElementsByClassPattern(/comment|discuss/i);
    }, videoUI.showCommentButton);
    
    // 隐藏/显示分享按钮
    this.toggleElement(() => {
      const shareElements = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'svg',
          attributes: { viewBox: '0 0 1024 1024' }
        }]
      });
      
      if (shareElements.length > 0) {
        return shareElements.filter(el => {
          // 尝试排除已找到的点赞和评论按钮
          const text = el.textContent.toLowerCase();
          return text.includes('share') || text.includes('分享');
        });
      } else {
        return this.findElementsByClassPattern(/share|forward/i);
      }
    }, videoUI.showShareButton);
    
    // 隐藏/显示作者信息
    this.toggleElement(() => {
      // 查找包含头像的元素，通常是作者信息
      const avatarElements = this.findElementsByStructure({
        tagName: 'img',
        attributes: { class: /avatar|user/i }
      });
      
      if (avatarElements.length > 0) {
        return avatarElements.map(img => img.closest('div') || img);
      }
      
      return this.findElementsByClassPattern(/author|user|avatar/i);
    }, videoUI.showAuthorInfo);
    
    // 隐藏/显示音乐信息
    this.toggleElement(() => {
      // 查找包含音乐相关文本或图标的元素
      const musicElements = this.findElementsByStructure({
        text: '音乐'
      });
      
      if (musicElements.length > 0) {
        return musicElements.map(el => el.closest('div') || el);
      }
      
      return this.findElementsByClassPattern(/music|sound/i);
    }, videoUI.showMusicInfo);
    
    // 隐藏/显示描述
    this.toggleElement(() => {
      // 查找包含长文本的元素，可能是视频描述
      const textElements = document.body.querySelectorAll('div');
      const descriptions = Array.from(textElements).filter(el => {
        return el.textContent.length > 20 && 
               el.textContent.length < 200 && 
               !el.querySelector('img') &&
               !el.querySelector('video');
      });
      
      if (descriptions.length > 0) {
        return descriptions;
      }
      
      return this.findElementsByClassPattern(/desc|description|content/i);
    }, videoUI.showDescription);
    
    // 隐藏/显示推荐
    this.toggleElement(() => {
      // 查找可能包含推荐内容的容器
      const recommendationContainers = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'video'
        }]
      });
      
      if (recommendationContainers.length > 0) {
        return recommendationContainers;
      }
      
      return this.findElementsByClassPattern(/recommend|suggest|related/i);
    }, videoUI.showRecommendations);
    
    // 自定义控制栏
    if (videoUI.controlBar) {
      this.customizeControlBar(videoUI.controlBar);
    }
    
    // 应用自定义布局
    this.applyLayout('video', videoUI.layout);
  }

  /**
   * 应用直播间界面定制
   */
  applyLiveCustomizations() {
    console.log('应用直播间界面定制');
    
    if (!this.config.liveUI) return;
    
    const { liveUI } = this.config;
    
    // 隐藏/显示礼物（增强礼物识别能力）
    this.toggleElement(() => {
      logger.info('[UI定制] 开始查找礼物元素...');
      
      // 1. 组合所有可能的礼物相关元素
      let giftElements = [];
      
      // 通过类名模式匹配多种礼物相关元素
      giftElements = giftElements.concat(
        this.findElementsByClassPattern(/gift|present|reward|award|effect|animation|特效|礼物|打赏|赠送|连击|连击奖励|豪华礼物|礼物特效|礼物动画|送礼物|礼物展示/i)
      );
      
      // 通过属性和结构特征查找
      giftElements = giftElements.concat(
        this.findElementsByStructure({
          attributes: {
            class: /gift|present|reward|award|effect|animation/i
          }
        })
      );
      
      // 查找可能是礼物动画的元素
      const animatedElements = document.body.querySelectorAll('div');
      const potentialGiftAnims = Array.from(animatedElements).filter(el => {
        const style = window.getComputedStyle(el);
        // 礼物通常有动画效果、较高的z-index、绝对定位
        return (style.animationName !== 'none' || 
                style.transitionProperty.includes('transform') ||
                style.transform !== 'none') && 
               parseInt(style.zIndex) > 100 &&
               style.position !== 'static';
      });
      
      giftElements = giftElements.concat(potentialGiftAnims);
      
      // 查找包含特定文字的礼物元素
      const textGiftElements = this.findElementsByStructure({
        text: /礼物|特效|打赏|赠送|连击|连击奖励|豪华礼物/i
      });
      
      // 收集这些元素及其父容器
      if (textGiftElements.length > 0) {
        textGiftElements.forEach(el => {
          giftElements.push(el);
          giftElements.push(el.closest('div') || el);
          giftElements.push(el.closest('.gift-container') || el);
          giftElements.push(el.closest('.animation-container') || el);
        });
      }
      
      // 去重
      giftElements = [...new Set(giftElements)];
      
      logger.info(`[UI定制] 找到 ${giftElements.length} 个礼物相关元素`);
      return giftElements;
    }, liveUI.showGifts);
    
    // 隐藏/显示弹幕
    this.toggleElement(() => {
      // 查找可能包含弹幕的元素
      const bulletElements = document.body.querySelectorAll('div');
      const potentialBullets = Array.from(bulletElements).filter(el => {
        // 弹幕通常是半透明覆盖层
        const style = window.getComputedStyle(el);
        return style.position === 'absolute' && 
               style.pointerEvents === 'none' &&
               style.zIndex > 0;
      });
      
      if (potentialBullets.length > 0) {
        return potentialBullets;
      }
      
      // 备用方案：通过类名模式匹配
      return this.findElementsByClassPattern(/danmu|bullet|comment|danmaku/i);
    }, liveUI.showDanmaku);
    
    // 隐藏/显示推荐
    this.toggleElement(() => {
      // 查找可能包含推荐内容的容器
      const recommendationContainers = this.findElementsByStructure({
        tagName: 'div',
        children: [{
          tagName: 'img'
        }]
      });
      
      if (recommendationContainers.length > 0) {
        return recommendationContainers;
      }
      
      return this.findElementsByClassPattern(/recommend|suggest|related|live-recommend/i);
    }, liveUI.showRecommendations);
    
    // 隐藏/显示广告
    this.toggleElement(() => {
      // 查找可能是广告的元素
      const adElements = this.findElementsByStructure({
        text: /广告|推广|ad|promotion/i
      });
      
      if (adElements.length > 0) {
        return adElements.map(el => el.closest('div') || el);
      }
      
      return this.findElementsByClassPattern(/ad|advertisement|promotion|广告/i);
    }, liveUI.showAds);
    
    // 隐藏/显示统计信息
    this.toggleElement(() => {
      // 查找可能包含数字的元素，可能是统计信息
      const numberElements = document.body.querySelectorAll('div');
      const potentialStats = Array.from(numberElements).filter(el => {
        return /\d+/.test(el.textContent);
      });
      
      if (potentialStats.length > 0) {
        return potentialStats;
      }
      
      return this.findElementsByClassPattern(/stat|count|number|view/i);
    }, liveUI.showStats);
    
    // 自定义弹幕样式
    if (liveUI.danmaku) {
      this.customizeDanmaku(liveUI.danmaku);
    }
    
    // 应用自定义布局
    this.applyLayout('live', liveUI.layout);
  }

  /**
   * 切换元素的显示/隐藏
   * @param {string|Function} selectorOrFinder - CSS选择器或元素查找函数
   * @param {boolean} show - 是否显示
   */
  /**
   * 切换元素显示状态
   * @param {Function|string} selectorOrFinder - 元素选择器或查找函数
   * @param {boolean} show - 是否显示元素
   */
  toggleElement(selectorOrFinder, show) {
    let elements = [];
    
    // 支持函数查找器或选择器字符串
    if (typeof selectorOrFinder === 'function') {
      try {
        elements = selectorOrFinder() || [];
      } catch (e) {
        logger.error('查找元素函数执行失败:', e);
        return;
      }
    } else if (typeof selectorOrFinder === 'string' && selectorOrFinder.trim() !== '') {
      try {
        elements = getElements(selectorOrFinder);
      } catch (e) {
        logger.error('无效的CSS选择器:', selectorOrFinder, e);
        return;
      }
    } else {
      logger.error('无效的选择器或查找函数参数');
      return;
    }
    
    // 使用增强的toggleElements函数
    const result = toggleElements(elements, show);
    
    return result;
  }
  
  /**
   * 使用增强的DOM工具函数查找符合结构特征的元素
   * @param {Object} options - 结构查找选项
   * @returns {HTMLElement[]} - 找到的元素数组
   */
  findElementsByStructure(options) {
    return findElementsByStructure(options);
  }

  /**
   * 使用增强的DOM工具函数查找符合类名模式的元素
   * @param {RegExp} pattern - 类名正则表达式
   * @param {string} tagName - 标签名筛选
   * @returns {HTMLElement[]} - 找到的元素数组
   */
  findElementsByClassPattern(pattern, tagName = '*') {
    return findElementsByClassPattern(pattern, tagName);
  }

  /**
   * 自定义控制栏
   * @param {Object} controlBarConfig - 控制栏配置
   */
  customizeControlBar(controlBarConfig) {
    const controlBar = document.querySelector('.video-control-bar');
    if (!controlBar) return;
    
    // 显示/隐藏控制栏
    if (!controlBarConfig.show) {
      controlBar.style.display = 'none';
      return;
    }
    
    // 设置控制栏位置
    if (controlBarConfig.position) {
      controlBar.style.position = 'absolute';
      switch (controlBarConfig.position) {
        case 'top':
          controlBar.style.top = '0';
          controlBar.style.bottom = 'auto';
          break;
        case 'bottom':
          controlBar.style.bottom = '0';
          controlBar.style.top = 'auto';
          break;
        default:
          controlBar.style.bottom = '0';
      }
    }
    
    // 自动隐藏功能（需要额外的事件监听）
    if (controlBarConfig.autoHide) {
      // 实现自动隐藏逻辑
    }
  }

  /**
   * 自定义弹幕样式
   * @param {Object} danmakuConfig - 弹幕配置
   */
  customizeDanmaku(danmakuConfig) {
    // 添加弹幕样式
    const styleId = 'douyin-danmaku-custom-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    let css = '';
    
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
      // 根据速度设置动画时长
      let duration = 6; // 默认6秒
      switch (danmakuConfig.speed) {
        case 'fast':
          duration = 3;
          break;
        case 'slow':
          duration = 10;
          break;
        default:
          duration = 6;
      }
      css += `.danmaku { animation-duration: ${duration}s !important; }`;
    }
    
    styleElement.textContent = css;
  }

  /**
   * 隐藏设置面板
   */
  hideSettingsPanel() {
    if (!this.settingsPanel) return;
    
    this.isPanelVisible = false;
    
    // 添加淡出动画
    this.settingsPanel.style.transition = 'opacity 0.3s ease-out';
    this.settingsPanel.style.opacity = '0';
    
    // 动画结束后隐藏面板
    setTimeout(() => {
      if (this.settingsPanel) {
        this.settingsPanel.style.display = 'none';
      }
    }, 300);
  }

  /**
   * 应用自定义布局
   * @param {string} type - 类型（video或live）
   * @param {string} layout - 布局名称
   */
  applyLayout(type, layout) {
    if (!layout || layout === 'default') return;
    
    // 根据不同类型和布局应用相应的样式
    // 这里可以扩展更多布局选项
    console.log(`应用${type}布局：${layout}`);
  }

  /**
   * 显示设置面板
   */
  showSettingsPanel() {
    // 如果设置面板已存在，先移除
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }
    
    // 创建设置面板
    this.settingsPanel = this.createSettingsPanel();
    document.body.appendChild(this.settingsPanel);
    
    // 启用设置面板拖拽功能
    this.makePanelDraggable(this.settingsPanel);
  }

  /**
   * 统一应用所有UI定制
   */
  applyAllCustomizations() {
    console.log('[UI定制] 开始统一应用所有UI定制');
    
    try {
      // 检测页面类型并应用相应的定制
      const pageType = this.detectPageType();
      console.log(`[UI定制] 检测到页面类型: ${pageType}`);
      
      switch (pageType) {
        case 'video':
          this.applyVideoCustomizations();
          break;
        case 'live':
          this.applyLiveCustomizations();
          break;
        default:
          console.log('[UI定制] 未识别的页面类型，尝试应用通用定制');
          this.applyVideoCustomizations(); // 默认尝试应用视频定制
      }
      
      // 应用主题
      if (this.config.theme) {
        this.applyTheme(this.config.theme);
      }
    } catch (error) {
      console.error('[UI定制] 应用定制时出错:', error);
    }
  }

  /**
   * 检测当前页面类型
   * @returns {string} 页面类型 (video/live/home/other)
   */
  detectPageType() {
    if (document.querySelector('video[autoplay]')) {
      return 'video';
    }
    
    if (document.querySelector('.live, .live-room, [data-type="live"]')) {
      return 'live';
    }
    
    return 'other';
  }

  /**
   * 处理页面滚动事件
   * @param {Event} e - 滚动事件对象
   */
  handleScroll(e) {
    const currentScroll = window.scrollY;
    
    // 检测滚动方向
    const direction = currentScroll > this.lastScrollPosition ? 'down' : 'up';
    this.lastScrollPosition = currentScroll;
    
    // 可以在这里实现基于滚动的UI交互，例如隐藏/显示设置面板
    if (this.settingsPanel && this.isPanelVisible) {
      // 向下滚动超过一定距离时自动隐藏面板
      if (direction === 'down' && currentScroll > 100) {
        this.hideSettingsPanel();
      }
    }
  }

  /**
   * 创建设置面板
   * @returns {HTMLElement} 设置面板元素
   */
  createSettingsPanel() {
    // 使用增强的createElement函数创建主容器
    const panel = createElement('div', {
      className: 'douyin-ui-customizer-panel',
      style: {
        animation: 'slideIn 0.3s ease-out'
      }
    });
    
    // 注入专用样式
    injectStyle(`
      .douyin-ui-customizer-panel {
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `);
    
    panel.innerHTML = `
      <div class="panel-header">
        <h2>抖音UI定制设置</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="settings-tabs">
          <button class="tab-btn active" data-tab="general">通用设置</button>
          <button class="tab-btn" data-tab="video">短视频设置</button>
          <button class="tab-btn" data-tab="live">直播间设置</button>
          <button class="tab-btn" data-tab="import-export">导入导出</button>
        </div>
        
        <div class="tab-content active" id="general-tab">
          ${this.createGeneralSettings()}
        </div>
        
        <div class="tab-content" id="video-tab">
          ${this.createVideoSettings()}
        </div>
        
        <div class="tab-content" id="live-tab">
          ${this.createLiveSettings()}
        </div>
        
        <div class="tab-content" id="import-export-tab">
          ${this.createImportExportSettings()}
        </div>
      </div>
      <div class="panel-footer">
        <button class="save-btn">保存设置</button>
        <button class="reset-btn">重置为默认</button>
      </div>
    `;
    
    // 添加事件监听
    this.setupSettingsPanelEvents(panel);
    
    return panel;
  }

  /**
   * 设置设置面板的事件监听
   * @param {HTMLElement} panel - 设置面板元素
   */
  setupSettingsPanelEvents(panel) {
    // 关闭按钮
    const closeBtn = panel.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.remove();
      });
    }
    
    // 标签切换
    const tabBtns = panel.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (!tabId) return;
        
        // 移除所有活跃状态
        tabBtns.forEach(b => b.classList.remove('active'));
        panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // 设置当前活跃状态
        btn.classList.add('active');
        const tabContent = panel.querySelector(`#${tabId}-tab`);
        if (tabContent) {
          tabContent.classList.add('active');
        }
      });
    });
    
    // 保存按钮
    const saveBtn = panel.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings(panel);
      });
    }
    
    // 重置按钮
    const resetBtn = panel.querySelector('.reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置所有设置吗？')) {
          if (typeof resetConfig === 'function') {
            this.config = resetConfig();
          }
          panel.remove();
          location.reload();
        }
      });
    }
    
    // 初始化导入导出功能
    this.initImportExport(panel);
    
    // 取消拖动功能
  }
  
  /**
   * 使面板可拖动并确保不会移出窗口范围
   * @param {HTMLElement} panel - 要使其可拖动的面板元素
   */
  makePanelDraggable(panel) {
    if (!panel) return;
    
    const header = panel.querySelector('.panel-header');
    if (!header) return;
    
    // 确保面板初始化时就不会超出视口范围
    this.restrictPanelToViewport(panel);
    
    // 移除transform属性，改用left和top定位
    panel.style.transform = 'none';
    
    // 初始化面板可见状态
    this.isPanelVisible = true;
    
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
      // 只有点击标题栏区域才触发拖动
      if (e.target.closest('button')) return;
      
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      // 添加样式标识拖动状态
      panel.classList.add('dragging');
      
      // 防止文本选择
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // 计算新位置
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      
      // 限制在视口内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      
      // 确保面板不会移出视口范围
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
      
      // 设置位置
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      
      isDragging = false;
      panel.classList.remove('dragging');
      
      // 释放拖动后再次检查边界
      this.restrictPanelToViewport(panel);
    });
    
    // 添加触摸事件支持
    header.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) return;
      
      isDragging = true;
      const touch = e.touches[0];
      const rect = panel.getBoundingClientRect();
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
      
      panel.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      let newLeft = touch.clientX - offsetX;
      let newTop = touch.clientY - offsetY;
      
      // 限制在视口内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      
      // 确保面板不会移出视口范围
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelHeight));
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
      if (!isDragging) return;
      
      isDragging = false;
      panel.classList.remove('dragging');
      
      // 释放拖动后再次检查边界
      this.restrictPanelToViewport(panel);
    });
  }
  
  /**
   * 确保面板完全在视口范围内
   * @param {HTMLElement} panel - 面板元素
   */
  restrictPanelToViewport(panel) {
    if (!panel) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panel.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;
    
    let left = rect.left;
    let top = rect.top;
    
    // 检查左右边界
    if (left < 0) {
      left = 0;
    } else if (left + panelWidth > viewportWidth) {
      left = viewportWidth - panelWidth;
    }
    
    // 检查上下边界
    if (top < 0) {
      top = 0;
    } else if (top + panelHeight > viewportHeight) {
      top = viewportHeight - panelHeight;
    }
    
    // 应用修正后的位置
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  /**
   * 创建通用设置内容
   * @returns {string} HTML字符串
   */
  createGeneralSettings() {
    return `
      <div class="setting-group">
        <h3>主题设置</h3>
        <label>
          <input type="radio" name="theme" value="light" ${this.config.theme === 'light' ? 'checked' : ''}>
          浅色主题
        </label>
        <label>
          <input type="radio" name="theme" value="dark" ${this.config.theme === 'dark' ? 'checked' : ''}>
          深色主题
        </label>
      </div>
      
      <div class="setting-group">
        <h3>播放设置</h3>
        <label>
          <input type="checkbox" id="autoPlay" ${this.config.general?.autoPlay ? 'checked' : ''}>
          自动播放视频
        </label>
        <label>
          <input type="checkbox" id="autoScroll" ${this.config.general?.autoScroll ? 'checked' : ''}>
          自动滚动到下一个视频
        </label>
      </div>
      
      <div class="setting-group">
        <h3>功能设置</h3>
        <label>
          <input type="checkbox" id="keyboardShortcuts" ${this.config.general?.keyboardShortcuts ? 'checked' : ''}>
          启用键盘快捷键
        </label>
        <label>
          <input type="checkbox" id="notifications" ${this.config.general?.notifications ? 'checked' : ''}>
          启用通知提醒
        </label>
      </div>
    `;
  }

  /**
   * 创建短视频设置内容
   * @returns {string} HTML字符串
   */
  createVideoSettings() {
    return `
      <div class="setting-group">
        <h3>显示元素</h3>
        <label>
          <input type="checkbox" id="showLikeButton" ${this.config.video?.showLikeButton ?? true ? 'checked' : ''}>
          显示点赞按钮
        </label>
        <label>
          <input type="checkbox" id="showCommentButton" ${this.config.video?.showCommentButton ?? true ? 'checked' : ''}>
          显示评论按钮
        </label>
        <label>
          <input type="checkbox" id="showShareButton" ${this.config.video?.showShareButton ?? true ? 'checked' : ''}>
          显示分享按钮
        </label>
        <label>
          <input type="checkbox" id="showAuthorInfo" ${this.config.video?.showAuthorInfo ?? true ? 'checked' : ''}>
          显示作者信息
        </label>
        <label>
          <input type="checkbox" id="showMusicInfo" ${this.config.video?.showMusicInfo ?? true ? 'checked' : ''}>
          显示音乐信息
        </label>
        <label>
          <input type="checkbox" id="showVideoDesc" ${this.config.video?.showVideoDesc ?? true ? 'checked' : ''}>
          显示视频描述
        </label>
        <label>
          <input type="checkbox" id="showRecommendedVideos" ${this.config.video?.showRecommendedVideos ?? true ? 'checked' : ''}>
          显示推荐视频
        </label>
      </div>
      
      <div class="setting-group">
        <h3>控制栏设置</h3>
        <label>
          <input type="checkbox" id="showProgressBar" ${this.config.video?.showProgressBar ?? true ? 'checked' : ''}>
          显示进度条
        </label>
        <label>
          <input type="checkbox" id="showPlayPauseButton" ${this.config.video?.showPlayPauseButton ?? true ? 'checked' : ''}>
          显示播放/暂停按钮
        </label>
        <label>
          <input type="checkbox" id="showVolumeControl" ${this.config.video?.showVolumeControl ?? true ? 'checked' : ''}>
          显示音量控制
        </label>
        <label>
          <input type="checkbox" id="showFullscreenButton" ${this.config.video?.showFullscreenButton ?? true ? 'checked' : ''}>
          显示全屏按钮
        </label>
      </div>
    `;
  }

  /**
   * 创建直播间设置内容
   * @returns {string} HTML字符串
   */
  createLiveSettings() {
    return `
      <div class="setting-group">
        <h3>显示元素</h3>
        <label>
          <input type="checkbox" id="liveShowLikeButton" ${this.config.live?.showLikeButton ?? true ? 'checked' : ''}>
          显示点赞按钮
        </label>
        <label>
          <input type="checkbox" id="liveShowCommentButton" ${this.config.live?.showCommentButton ?? true ? 'checked' : ''}>
          显示评论按钮
        </label>
        <label>
          <input type="checkbox" id="liveShowShareButton" ${this.config.live?.showShareButton ?? true ? 'checked' : ''}>
          显示分享按钮
        </label>
        <label>
          <input type="checkbox" id="liveShowAuthorInfo" ${this.config.live?.showAuthorInfo ?? true ? 'checked' : ''}>
          显示作者信息
        </label>
        <label>
          <input type="checkbox" id="liveShowGiftButton" ${this.config.live?.showGiftButton ?? true ? 'checked' : ''}>
          显示礼物按钮
        </label>
      </div>
      
      <div class="setting-group">
        <h3>弹幕设置</h3>
        <label>
          <input type="checkbox" id="showDanmu" ${this.config.live?.showDanmu ?? true ? 'checked' : ''}>
          显示弹幕
        </label>
        <label>
          <input type="range" id="danmuOpacity" min="0" max="1" step="0.1" value="${this.config.live?.danmuOpacity ?? 1}">
          弹幕透明度: <span id="danmuOpacityValue">${(this.config.live?.danmuOpacity ?? 1) * 100}%</span>
        </label>
      </div>
    `;
  }
  
  /**
   * 创建导入导出设置内容
   * @returns {string} HTML字符串
   */
  createImportExportSettings() {
    return `
      <div class="setting-group">
        <h3>配置导入</h3>
        <textarea id="importConfig" placeholder="粘贴配置JSON字符串" rows="5" cols="40"></textarea>
        <button id="importBtn" class="action-btn">导入配置</button>
      </div>
      
      <div class="setting-group">
        <h3>配置导出</h3>
        <button id="exportBtn" class="action-btn">导出当前配置</button>
        <textarea id="exportConfig" placeholder="配置将在这里显示" rows="5" cols="40"></textarea>
        <button id="copyBtn" class="action-btn">复制到剪贴板</button>
      </div>
    `;
  }
  
  /**
   * 初始化导入导出功能
   * @param {HTMLElement} panel - 设置面板元素
   */
  initImportExport(panel) {
    if (!panel) return;
    
    // 导出配置
    const exportBtn = panel.querySelector('#exportBtn');
    const exportConfig = panel.querySelector('#exportConfig');
    const copyBtn = panel.querySelector('#copyBtn');
    
    if (exportBtn && exportConfig) {
      exportBtn.addEventListener('click', () => {
        try {
          exportConfig.value = JSON.stringify(this.config, null, 2);
        } catch (error) {
          logger.error('导出配置失败:', error);
          alert('导出配置失败');
        }
      });
    }
    
    // 复制到剪贴板
    if (copyBtn && exportConfig) {
      copyBtn.addEventListener('click', () => {
        exportConfig.select();
        try {
          document.execCommand('copy');
          alert('配置已复制到剪贴板');
        } catch (error) {
          logger.error('复制失败:', error);
          alert('复制失败');
        }
      });
    }
    
    // 导入配置
    const importBtn = panel.querySelector('#importBtn');
    const importConfig = panel.querySelector('#importConfig');
    
    if (importBtn && importConfig) {
      importBtn.addEventListener('click', () => {
        try {
          const newConfig = JSON.parse(importConfig.value);
          this.config = newConfig;
          this.saveConfig();
          alert('配置导入成功');
          location.reload();
        } catch (error) {
          logger.error('导入配置失败:', error);
          alert('导入配置失败，请检查JSON格式');
        }
      });
    }
  };

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      localStorage.setItem('douyin-ui-customizer-config', JSON.stringify(this.config));
      logger.info('配置已保存');
    } catch (error) {
      logger.error('保存配置失败:', error);
    }
  };

  /**
   * 应用配置到设置面板
   */
  applySettingsToPanel() {
    if (!this.settingsPanel) return;

    // 应用主题
    this.applyTheme(this.config.theme || 'light');
    
    logger.info('Settings applied to panel');

    // 添加事件监听
    this.settingsPanel.querySelectorAll('input[type="radio"][name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.config.theme = e.target.value;
        this.applyTheme(this.config.theme);
        this.saveConfig();
      });
    });

    // 通用设置事件监听
    const generalSettings = [
      'autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'
    ];

    generalSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.general) this.config.general = {};
          this.config.general[setting] = e.target.checked;
          this.saveConfig();
        });
      }
    });

    // 视频设置事件监听
    const videoSettings = [
      'showLikeButton', 'showCommentButton', 'showShareButton',
      'showAuthorInfo', 'showMusicInfo', 'showVideoDesc',
      'showRecommendedVideos', 'showProgressBar', 'showPlayPauseButton',
      'showVolumeControl', 'showFullscreenButton'
    ];

    videoSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.video) this.config.video = {};
          this.config.video[setting] = e.target.checked;
          this.saveConfig();
          this.applyVideoCustomizations();
        });
      }
    });

    // 直播间设置事件监听
    const liveSettings = [
      'liveShowLikeButton', 'liveShowCommentButton', 'liveShowShareButton',
      'liveShowAuthorInfo', 'liveShowGiftButton', 'showDanmu'
    ];

    liveSettings.forEach(setting => {
      const checkbox = this.settingsPanel.querySelector(`#${setting}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if (!this.config.live) this.config.live = {};
          this.config.live[setting] = e.target.checked;
          this.saveConfig();
          this.applyLiveCustomizations();
        });
      }
    });

    // 弹幕透明度设置
    const danmuOpacitySlider = this.settingsPanel.querySelector('#danmuOpacity');
    if (danmuOpacitySlider) {
      danmuOpacitySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.settingsPanel.querySelector('#danmuOpacityValue').textContent = `${value * 100}%`;
        if (!this.config.live) this.config.live = {};
        this.config.live.danmuOpacity = value;
        this.saveConfig();
        this.applyLiveCustomizations();
      });
    }
  }

  /**
   * 应用主题到页面
   * @param {string} theme - 主题名称
   */
  applyTheme(theme) {
    try {
      // 使用ThemeManager应用主题
      themeManager.applyTheme(theme);
      
      // 为设置面板应用主题特定样式
      if (this.settingsPanel) {
        const themeConfig = themeManager.getTheme(theme);
        if (themeConfig) {
          this.settingsPanel.style.backgroundColor = themeConfig.background || '#fff';
          this.settingsPanel.style.color = themeConfig.text || '#000';
          this.settingsPanel.style.borderColor = themeConfig.border || '#e0e0e0';
          
          // 应用到面板内元素
          const buttons = this.settingsPanel.querySelectorAll('button');
          buttons.forEach(btn => {
            btn.style.backgroundColor = themeConfig.buttonBackground || '#f5f5f5';
            btn.style.color = themeConfig.buttonText || '#333';
          });
        }
      }
      
      logger.info(`Theme ${theme} applied successfully`);
      eventEmitter.emit('ui.theme.applied', theme);
    } catch (error) {
      logger.error('Failed to apply theme:', error);
      eventEmitter.emit('ui.theme.error', error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  saveConfig() {
    try {
      saveConfig(this.config);
      logger.info('Config saved successfully');
      eventEmitter.emit('ui.config.saved', this.config);
    } catch (error) {
      logger.error('Failed to save config:', error);
      eventEmitter.emit('ui.config.error', error);
    }
  }

  /**
   * 初始化设置面板
   */
  initSettingsPanel() {
    // 创建设置面板
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'douyin-customizer-panel';
    this.settingsPanel.className = 'customizer-panel';
    
    // 设置面板样式
    this.settingsPanel.style.position = 'fixed';
    this.settingsPanel.style.left = '20px';
    this.settingsPanel.style.top = '20px';
    this.settingsPanel.style.width = '320px';
    this.settingsPanel.style.maxHeight = '80vh';
    this.settingsPanel.style.overflowY = 'auto';
    this.settingsPanel.style.backgroundColor = '#fff';
    this.settingsPanel.style.border = '1px solid #e0e0e0';
    this.settingsPanel.style.borderRadius = '8px';
    this.settingsPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    this.settingsPanel.style.zIndex = '9999';
    this.settingsPanel.style.padding = '20px';
    
    // 添加拖动句柄
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.cursor = 'move';
    dragHandle.style.padding = '10px';
    dragHandle.style.backgroundColor = '#f5f5f5';
    dragHandle.style.borderRadius = '4px 4px 0 0';
    dragHandle.style.marginBottom = '15px';
    dragHandle.textContent = '抖音UI定制工具 (拖动移动)';
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '18px';
    closeButton.style.lineHeight = '1';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'none';
      this.showToggleButton();
    });
    
    // 添加设置内容
    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';
    
    // 创建选项卡导航
    const tabNavigation = document.createElement('div');
    tabNavigation.className = 'tab-navigation';
    tabNavigation.innerHTML = `
      <button class="tab-button active" data-tab="general">通用设置</button>
      <button class="tab-button" data-tab="video">视频设置</button>
      <button class="tab-button" data-tab="live">直播设置</button>
    `;
    
    // 创建选项卡内容
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    
    // 通用设置选项卡
    const generalTab = document.createElement('div');
    generalTab.className = 'tab-pane active';
    generalTab.id = 'general-tab';
    generalTab.innerHTML = this.createGeneralSettings();
    
    // 视频设置选项卡
    const videoTab = document.createElement('div');
    videoTab.className = 'tab-pane';
    videoTab.id = 'video-tab';
    videoTab.innerHTML = this.createVideoSettings();
    
    // 直播设置选项卡
    const liveTab = document.createElement('div');
    liveTab.className = 'tab-pane';
    liveTab.id = 'live-tab';
    liveTab.innerHTML = this.createLiveSettings();
    
    // 组装设置面板
    this.settingsPanel.appendChild(dragHandle);
    this.settingsPanel.appendChild(closeButton);
    this.settingsPanel.appendChild(tabNavigation);
    tabContent.appendChild(generalTab);
    tabContent.appendChild(videoTab);
    tabContent.appendChild(liveTab);
    this.settingsPanel.appendChild(tabContent);
    
    // 添加到文档
    document.body.appendChild(this.settingsPanel);
    
    // 使面板可拖动
    this.makePanelDraggable(this.settingsPanel, dragHandle);
    
    // 初始化时检查并限制面板在视口内
    this.restrictPanelToViewport(this.settingsPanel);
    
    // 应用设置
    this.applySettingsToPanel();
    
    // 设置选项卡切换
    tabNavigation.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // 移除所有活动状态
        tabNavigation.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        tabContent.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // 添加活动状态
        button.classList.add('active');
        tabContent.querySelector(`#${tabId}-tab`).classList.add('active');
      });
    });
    
    // 初始化主题
    this.applyTheme(this.config.theme);
    
    // 触发面板初始化完成事件
    eventEmitter.emit('ui.panel.initialized');
    logger.info('Settings panel initialized');
  }

  /**
   * 显示切换按钮
   */
  showToggleButton() {
    let toggleButton = document.getElementById('douyin-customizer-toggle');
    
    if (!toggleButton) {
      toggleButton = document.createElement('button');
      toggleButton.id = 'douyin-customizer-toggle';
      toggleButton.className = 'customizer-toggle';
      toggleButton.style.position = 'fixed';
      toggleButton.style.left = '20px';
      toggleButton.style.bottom = '20px';
      toggleButton.style.width = '50px';
      toggleButton.style.height = '50px';
      toggleButton.style.borderRadius = '50%';
      toggleButton.style.border = 'none';
      toggleButton.style.backgroundColor = '#ff0050';
      toggleButton.style.color = 'white';
      toggleButton.style.fontSize = '16px';
      toggleButton.style.cursor = 'pointer';
      toggleButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      toggleButton.style.zIndex = '9998';
      toggleButton.style.display = 'flex';
      toggleButton.style.alignItems = 'center';
      toggleButton.style.justifyContent = 'center';
      toggleButton.innerHTML = '⚙️';
      
      document.body.appendChild(toggleButton);
    }
    
    toggleButton.style.display = 'flex';
    
    toggleButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'block';
      toggleButton.style.display = 'none';
    });
  }

  /**
   * 初始化UI管理器
   */
  init() {
    console.log('[UI管理器] 初始化UI管理器');
    
    try {
      // 初始化设置面板
      this.initSettingsPanel();
      
      // 初始化UI定制
      this.initUI();
      
      // 注册事件监听
      this.setupEvents();
    } catch (error) {
      console.error('[UI管理器] 初始化失败:', error);
    }
  }

  /**
   * 初始化UI定制
   */
  initUI() {
    console.log('[UI管理器] 初始化UI定制');
    
    // 显示切换按钮
    this.showToggleButton();
    
    // 使用统一的定制应用方法
    this.applyAllCustomizations();
  }

  /**
   * 设置事件监听
   */
  setupEvents() {
    console.log('[UI管理器] 设置事件监听');
    
    // 页面加载完成后应用定制
    addEvent(window, 'load', this.debouncedApplyCustomizations);
    
    // DOM内容变化时重新应用定制（用于SPA应用）
    addEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    
    // 使用MutationObserver监听DOM变化
    this.observeDomChanges();
    
    // 监听滚动事件
    addEvent(window, 'scroll', this.throttledHandleScroll);
    
    // 监听窗口大小变化
    addEvent(window, 'resize', this.debouncedApplyCustomizations);
    
    // 监听主题变化
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener) {
      addEvent(window.matchMedia('(prefers-color-scheme: dark)'), 'change', this.debouncedApplyCustomizations);
    }
  }

  /**
   * 观察DOM变化
   */
  observeDomChanges() {
    const observer = new MutationObserver(this.debouncedApplyCustomizations);
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    // 保存观察者实例以便后续清理
    this.domObserver = observer;
  }

  /**
   * 清理资源和事件监听
   */
  cleanup() {
    console.log('[UI管理器] 清理资源和事件监听');
    
    // 断开DOM观察者
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    // 移除事件监听
    removeEvent(window, 'load', this.debouncedApplyCustomizations);
    removeEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    removeEvent(window, 'scroll', this.throttledHandleScroll);
    removeEvent(window, 'resize', this.debouncedApplyCustomizations);
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').removeEventListener) {
      removeEvent(window.matchMedia('(prefers-color-scheme: dark)'), 'change', this.debouncedApplyCustomizations);
    }
  }
}

// 导出UIManager类
export default UIManager;