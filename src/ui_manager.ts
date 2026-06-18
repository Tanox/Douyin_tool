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
} from './utils/dom';
import logger from './utils/logger';
import eventEmitter from './utils/eventEmitter';
import themeManager from './styles/theme';
import autoExecutor from './utils/autoExecutor';

import {
  createSettingsPanelContent,
  injectPanelStyles
} from './ui/panels/settingsPanel';

import {
  setupSettingsPanelEvents,
  applySettingsToPanel,
  setupAutoExecutorEvents,
  updateAutoExecutorStatus
} from './ui/panels/settingsEvents';

import { makePanelDraggable, restrictPanelToViewport } from './ui/core/panelDrag';
import { applyVideoCustomizations } from './ui/customizations/videoCustomizations';
import { applyLiveCustomizations } from './ui/customizations/liveCustomizations';
import type { Config } from './config';

class UIManager {
  config: Config;
  settingsPanel: HTMLElement | null;
  toggleButton: HTMLButtonElement | null;
  isPanelVisible: boolean;
  lastScrollPosition: number;
  debouncedApplyCustomizations: () => void;
  throttledHandleScroll: (e: Event) => void;
  mutationObserver: MutationObserver | null;
  domObserver: MutationObserver | null;
  autoExecutorStatusInterval: ReturnType<typeof setInterval> | null;
  autoExecutor: typeof autoExecutor;

  constructor(config: Config) {
    this.config = config;
    this.settingsPanel = null;
    this.toggleButton = null;
    this.isPanelVisible = false;
    this.lastScrollPosition = 0;

    this.debouncedApplyCustomizations = debounce(() => this.applyAllCustomizations(), 500);
    this.throttledHandleScroll = throttle((...args: unknown[]) => {
      const e = args[0] as Event;
      this.handleScroll(e);
    }, 100);
    this.mutationObserver = null;
    this.domObserver = null;
    this.autoExecutorStatusInterval = null;

    this.autoExecutor = autoExecutor;

    logger.info('UIManager initialized with config');

    (themeManager as any).on('themeChanged', (newTheme: string) => {
      logger.info(`Theme changed to ${newTheme}`);
      this.applyTheme(newTheme);
    });
  }

  applyVideoCustomizations(): void {
    applyVideoCustomizations(this);
  }

  applyLiveCustomizations(): void {
    applyLiveCustomizations(this);
  }

  toggleElement(selectorOrFinder: string | (() => HTMLElement[]), show: boolean): void {
    let elements: HTMLElement[] = [];
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

    toggleElements(elements, show);
  }

  findElementsByStructure(options: any): HTMLElement[] {
    return findElementsByStructure(options as any);
  }

  findElementsByClassPattern(pattern: RegExp, container?: HTMLElement | Document): HTMLElement[] {
    return findElementsByClassPattern(pattern, container);
  }

  customizeControlBar(controlBarConfig: { show?: boolean; position?: string; autoHide?: boolean }): void {
    const controlBar = document.querySelector('.video-control-bar') as HTMLElement;
    if (!controlBar) return;

    if (!controlBarConfig.show) {
      controlBar.style.display = 'none';
      return;
    }

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
  }

  customizeDanmaku(danmakuConfig: { fontSize?: number; color?: string; opacity?: number; speed?: string }): void {
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
      let duration = 6;
      switch (danmakuConfig.speed) {
        case 'fast': duration = 3; break;
        case 'slow': duration = 10; break;
        default: duration = 6;
      }
      css += `.danmaku { animation-duration: ${duration}s !important; }`;
    }

    styleElement.textContent = css;
  }

  hideSettingsPanel(): void {
    if (!this.settingsPanel) return;
    this.isPanelVisible = false;
    this.settingsPanel.style.transition = 'opacity 0.3s ease-out';
    this.settingsPanel.style.opacity = '0';
    setTimeout(() => {
      if (this.settingsPanel) {
        this.settingsPanel.style.display = 'none';
      }
    }, 300);
  }

  applyLayout(type: string, layout: string): void {
    if (!layout || layout === 'default') return;
    logger.info(`应用${type}布局：${layout}`);
  }

  showSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }

    this.settingsPanel = this.createSettingsPanel();
    document.body.appendChild(this.settingsPanel);
    this.makePanelDraggable(this.settingsPanel);
  }

  createSettingsPanel(): HTMLElement {
    const panel = createElement('div', {
      className: 'douyin-ui-customizer-panel',
      style: { animation: 'slideIn 0.3s ease-out' }
    });

    injectPanelStyles();
    panel.innerHTML = createSettingsPanelContent(this.config);
    setupSettingsPanelEvents(panel, this);

    return panel;
  }

  makePanelDraggable(panel: HTMLElement): void {
    makePanelDraggable(panel);
    restrictPanelToViewport(panel);
  }

  applyAllCustomizations(): void {
    logger.info('[UI定制] 开始统一应用所有UI定制');
    try {
      const pageType = this.detectPageType();
      logger.info(`[UI定制] 检测到页面类型: ${pageType}`);

      switch (pageType) {
        case 'video':
          this.applyVideoCustomizations();
          break;
        case 'live':
          this.applyLiveCustomizations();
          break;
        default:
          logger.info('[UI定制] 未识别的页面类型，尝试应用通用定制');
          this.applyVideoCustomizations();
      }

      if (this.config.theme) {
        this.applyTheme(this.config.theme);
      }
    } catch (error) {
      logger.error('[UI定制] 应用定制时出错:', error);
    }
  }

  detectPageType(): string {
    if (document.querySelector('video[autoplay]')) return 'video';
    if (document.querySelector('.live, .live-room, [data-type="live"]')) return 'live';
    return 'other';
  }

  handleScroll(e: Event): void {
    const currentScroll = window.scrollY;
    const direction = currentScroll > this.lastScrollPosition ? 'down' : 'up';
    this.lastScrollPosition = currentScroll;

    if (this.settingsPanel && this.isPanelVisible) {
      if (direction === 'down' && currentScroll > 100) {
        this.hideSettingsPanel();
      }
    }
  }

  applyTheme(theme: string): void {
    try {
      (themeManager as any).applyTheme(theme);
      if (this.settingsPanel) {
        const themeConfig = (themeManager as any).getTheme(theme);
        if (themeConfig && themeConfig.variables) {
          // 安全地访问 themeConfig 属性
          const themeConfigObj = themeConfig.variables as Record<string, string>;
          this.settingsPanel.style.backgroundColor = themeConfigObj['--bg-primary'] || '#fff';
          this.settingsPanel.style.color = themeConfigObj['--text-primary'] || '#000';
          this.settingsPanel.style.borderColor = themeConfigObj['--border-color'] || '#e0e0e0';

          const buttons = this.settingsPanel.querySelectorAll('button');
          buttons.forEach(btn => {
            btn.style.backgroundColor = themeConfigObj['--bg-secondary'] || '#f5f5f5';
            btn.style.color = themeConfigObj['--text-primary'] || '#333';
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

  saveToLocalStorage(config: Config): void {
    try {
      localStorage.setItem('douyin-ui-customizer-config', JSON.stringify(config));
      logger.info('配置已保存到localStorage');
    } catch (error) {
      logger.error('保存到localStorage失败:', error);
    }
  }

  saveConfig(): void {
    try {
      // 直接使用导入的 configManager
      // 我们需要先修改一下以正确访问 configManager
      this.saveToLocalStorage(this.config);
    } catch (error) {
      logger.error('保存配置失败:', error);
      this.saveToLocalStorage(this.config);
    }
  }

  async saveSettings(panel: HTMLElement): Promise<void> {
    try {
      const themeRadios = panel.querySelectorAll('input[type="radio"][name="theme"]');
      for (const radio of themeRadios) {
        if ((radio as HTMLInputElement).checked) {
          this.config.theme = (radio as HTMLInputElement).value;
          break;
        }
      }

      const generalSettings = ['autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'];
      generalSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.general) this.config.general = {} as Config['general'];
          (this.config.general as unknown as Record<string, boolean>)[setting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
      videoSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          (this.config.videoUI as unknown as Record<string, boolean>)[setting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
      controlBarSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          if (!this.config.videoUI.controlBar) this.config.videoUI.controlBar = {} as Config['videoUI']['controlBar'];
          const controlBarSetting = setting.replace('controlBar-', '');
          let value: string | boolean | number = (element as HTMLInputElement).value;
          if ((element as HTMLInputElement).type === 'checkbox') value = (element as HTMLInputElement).checked;
          else if (controlBarSetting === 'opacity') value = parseFloat(value as string);
          (this.config.videoUI.controlBar as unknown as Record<string, unknown>)[controlBarSetting] = value;
        }
      });

      const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
      playbackSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.videoUI) this.config.videoUI = {} as Config['videoUI'];
          if (!this.config.videoUI.playback) this.config.videoUI.playback = {} as Config['videoUI']['playback'];
          const playbackSetting = setting.replace('playback-', '');
          let value: string | boolean = (element as HTMLInputElement).value;
          if ((element as HTMLInputElement).type === 'checkbox') value = (element as HTMLInputElement).checked;
          (this.config.videoUI.playback as unknown as Record<string, unknown>)[playbackSetting] = value;
        }
      });

      const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
      liveSettings.forEach(setting => {
        const checkbox = panel.querySelector(`#${setting}`);
        if (checkbox) {
          if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
          const liveSetting = setting.replace('liveShow', 'show');
          (this.config.liveUI as unknown as Record<string, boolean>)[liveSetting] = (checkbox as HTMLInputElement).checked;
        }
      });

      const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
      danmakuSettings.forEach(setting => {
        const element = panel.querySelector(`#${setting}`);
        if (element) {
          if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
          if (!this.config.liveUI.danmaku) this.config.liveUI.danmaku = {} as Config['liveUI']['danmaku'];
          const danmakuSetting = setting.replace('danmaku-', '');
          let value: string | number = (element as HTMLInputElement).value;
          if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') value = parseInt(value as string);
          else if (danmakuSetting === 'opacity') value = parseFloat(value as string);
          (this.config.liveUI.danmaku as unknown as Record<string, unknown>)[danmakuSetting] = value;
        }
      });

      const liveLayoutSelect = panel.querySelector('#live-layout');
      if (liveLayoutSelect) {
        if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
        this.config.liveUI.layout = (liveLayoutSelect as HTMLSelectElement).value;
      }

      const liveVolumeSlider = panel.querySelector('#live-volume');
      if (liveVolumeSlider) {
        if (!this.config.liveUI) this.config.liveUI = {} as Config['liveUI'];
        this.config.liveUI.volume = parseInt((liveVolumeSlider as HTMLInputElement).value);
      }

      const debugModeCheckbox = panel.querySelector('#advanced-debugMode');
      const performanceModeCheckbox = panel.querySelector('#advanced-performanceMode');
      const customCSS = panel.querySelector('#advanced-customCSS');

      if (!this.config.advanced) this.config.advanced = {} as Config['advanced'];
      if (debugModeCheckbox) this.config.advanced.debugMode = (debugModeCheckbox as HTMLInputElement).checked;
      if (performanceModeCheckbox) this.config.advanced.performanceMode = (performanceModeCheckbox as HTMLInputElement).checked;
      if (customCSS) this.config.advanced.customCSS = (customCSS as HTMLTextAreaElement).value;

      const scriptItems = panel.querySelectorAll('#custom-scripts-list .script-item input');
      const customScripts: string[] = [];
      let hasScripts = false;

      scriptItems.forEach(input => {
        const value = (input as HTMLInputElement).value.trim();
        if (value) {
          customScripts.push(value);
          hasScripts = true;
        }
      });

      if (hasScripts) {
        const confirmed = confirm('警告：自定义脚本可能会带来安全风险，是否继续保存？');
        if (!confirmed) return;

        for (const script of customScripts) {
          if (script.includes('eval(') || script.includes('Function(') || script.includes('innerHTML') || script.includes('document.write') || script.includes('execScript')) {
            const scriptConfirmed = confirm('警告：检测到可能的危险代码，是否确认添加此脚本？');
            if (!scriptConfirmed) return;
          }

          if (script.startsWith('http://') || script.startsWith('https://')) {
            const allowedDomains = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'jsdelivr.net', 'cdnjs.com'];
            const url = new URL(script);
            const domain = url.hostname;

            const isTrustedDomain = allowedDomains.some(allowedDomain =>
              domain === allowedDomain || domain.endsWith('.' + allowedDomain)
            );
            if (!isTrustedDomain) {
              const urlConfirmed = confirm(`警告：脚本URL来自非白名单域名 (${domain})，是否确认添加此脚本？`);
              if (!urlConfirmed) return;
            }
          }
        }
      }

      this.config.advanced.customScripts = customScripts;

      let validationResult = { valid: true, issues: [] as string[] };
      try {
        // 使用基础验证代替导入
        validationResult = this.basicValidateConfig(this.config);
      } catch (error) {
        logger.error('验证配置失败:', error);
        validationResult = this.basicValidateConfig(this.config);
      }

      if (!validationResult.valid) {
        const errorMessage = '配置验证失败：\n' + validationResult.issues.join('\n');
        alert(errorMessage);
        return;
      }

      this.saveConfig();
      logger.info('Settings saved from panel');
      this.applyAllCustomizations();
      alert('设置保存成功！');
    } catch (error) {
      logger.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    }
  }

  basicValidateConfig(config: Config): { valid: boolean; issues: string[] } {
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
      if (config.liveUI?.volume && (config.liveUI.volume < 0 || config.liveUI.volume > 100)) {
        issues.push('音量应在 0-100 之间');
      }
      if (config.videoUI?.controlBar?.opacity && (config.videoUI.controlBar.opacity < 0.1 || config.videoUI.controlBar.opacity > 1)) {
        issues.push('控制栏透明度应在 0.1-1 之间');
      }
    } catch (error) {
      logger.error('基本验证配置失败:', error);
      issues.push('配置验证过程中发生错误');
    }

    return { valid: issues.length === 0, issues };
  }

  init(): void {
    logger.info('[UI管理器] 初始化UI管理器');
    try {
      this.initSettingsPanel();
      this.initUI();
      this.setupEvents();
    } catch (error) {
      logger.error('[UI管理器] 初始化失败:', error);
    }
  }

  initUI(): void {
    logger.info('[UI管理器] 初始化UI定制');
    this.showToggleButton();
    this.applyAllCustomizations();
  }

  setupEvents(): void {
    logger.info('[UI管理器] 设置事件监听');
    addEvent(window, 'load', this.debouncedApplyCustomizations);
    addEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    this.observeDomChanges();
    addEvent(window, 'scroll', this.throttledHandleScroll);
    addEvent(window, 'resize', this.debouncedApplyCustomizations);

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme)');
      if ('addEventListener' in mq) {
        addEvent(mq, 'change', this.debouncedApplyCustomizations);
      }
    }
  }

  observeDomChanges(): void {
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

  cleanup(): void {
    logger.info('[UI管理器] 清理资源和事件监听');
    if (this.domObserver) {
      this.domObserver.disconnect();
    }

    removeEvent(window, 'load', this.debouncedApplyCustomizations);
    removeEvent(document, 'DOMContentLoaded', this.debouncedApplyCustomizations);
    removeEvent(window, 'scroll', this.throttledHandleScroll);
    removeEvent(window, 'resize', this.debouncedApplyCustomizations);

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme)');
      if ('removeEventListener' in mq) {
        removeEvent(mq, 'change', this.debouncedApplyCustomizations);
      }
    }

    if (this.autoExecutorStatusInterval) {
      clearInterval(this.autoExecutorStatusInterval);
    }
  }

  initSettingsPanel(): void {
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'douyin-customizer-panel';
    this.settingsPanel.className = 'customizer-panel';

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

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.style.cursor = 'move';
    dragHandle.style.padding = '10px';
    dragHandle.style.backgroundColor = '#f5f5f5';
    dragHandle.style.borderRadius = '4px 4px 0 0';
    dragHandle.style.marginBottom = '15px';
    dragHandle.textContent = '抖音UI定制工具 (拖动移动)';

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
      this.settingsPanel!.style.display = 'none';
      this.showToggleButton();
    });

    const settingsContent = document.createElement('div');
    settingsContent.className = 'settings-content';

    const tabNavigation = document.createElement('div');
    tabNavigation.className = 'tab-navigation';
    tabNavigation.innerHTML = `
      <div>
        <button class="tab-button active" data-tab="general">通用设置</button>
        <button class="tab-button" data-tab="video">视频设置</button>
      </div>
      <button class="tab-button" data-tab="live">直播设置</button>
    `;

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';

    const generalTab = document.createElement('div');
    generalTab.className = 'tab-pane active';
    generalTab.id = 'general-tab';
    generalTab.innerHTML = createSettingsPanelContent(this.config).match(/<div class="tab-content active" id="general-tab">([\s\S]*?)<\/div>\s*<div class="tab-content"/)?.[1] || '';

    const videoTab = document.createElement('div');
    videoTab.className = 'tab-pane';
    videoTab.id = 'video-tab';

    const liveTab = document.createElement('div');
    liveTab.className = 'tab-pane';
    liveTab.id = 'live-tab';

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

    tabNavigation.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        tabNavigation.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        tabContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        button.classList.add('active');
        tabContent.querySelector(`#${tabId}-tab`)?.classList.add('active');
      });
    });

    this.applyTheme(this.config.theme);
    eventEmitter.emit('ui.panel.initialized');
    logger.info('Settings panel initialized');
  }

  restrictPanelToViewport(panel: HTMLElement): void {
    restrictPanelToViewport(panel);
  }

  showToggleButton(): void {
    let toggleButton = document.getElementById('douyin-customizer-toggle') as HTMLButtonElement;
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
      this.settingsPanel!.style.display = 'block';
      toggleButton.style.display = 'none';
    });
  }
}

export default UIManager;