import logger from '../../utils/logger';
import eventEmitter from '../../utils/eventEmitter';
import type UIManager from '../../ui_manager';

export function setupSettingsPanelEvents(panel: HTMLElement, uiManager: UIManager): void {
  const closeBtn = panel.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.remove();
    });
  }

  const tabBtns = panel.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabContent = panel.querySelector(`#${tabId}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });

  const saveBtn = panel.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      uiManager.saveSettings(panel);
    });
  }

  const resetBtn = panel.querySelector('.reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置所有设置吗？')) {
        uiManager.config = (window as any).resetConfig?.() || uiManager.config;
        panel.remove();
        location.reload();
      }
    });
  }

  initImportExport(panel, uiManager);
  setupAutoExecutorEvents(panel, uiManager);
}

function initImportExport(panel: HTMLElement, uiManager: UIManager): void {
  if (!panel) return;

  const exportBtn = panel.querySelector('#exportBtn');
  const exportConfig = panel.querySelector('#exportConfig') as HTMLTextAreaElement;
  const copyBtn = panel.querySelector('#copyBtn');

  if (exportBtn && exportConfig) {
    exportBtn.addEventListener('click', () => {
      try {
        exportConfig.value = JSON.stringify(uiManager.config, null, 2);
      } catch (error) {
        logger.error('导出配置失败:', error);
        alert('导出配置失败');
      }
    });
  }

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

  const importBtn = panel.querySelector('#importBtn');
  const importConfig = panel.querySelector('#importConfig') as HTMLTextAreaElement;

  if (importBtn && importConfig) {
    importBtn.addEventListener('click', () => {
      try {
        const newConfig = JSON.parse(importConfig.value);
        uiManager.config = newConfig;
        uiManager.saveConfig();
        alert('配置导入成功');
        location.reload();
      } catch (error) {
        logger.error('导入配置失败:', error);
        alert('导入配置失败，请检查JSON格式');
      }
    });
  }
}

// 暂时禁用 auto executor 相关功能，因为 Config 接口未包含相关字段
export function setupAutoExecutorEvents(panel: HTMLElement, uiManager: UIManager): void {
  // 暂时注释掉，需要先更新 Config 接口
  logger.info('Auto executor events temporarily disabled');
}

export function updateAutoExecutorStatus(panel: HTMLElement, autoExecutor: unknown): void {
  logger.info('Auto executor status update temporarily disabled');
}

export function applySettingsToPanel(uiManager: UIManager): void {
  const panel = uiManager.settingsPanel;
  if (!panel) return;

  uiManager.applyTheme(uiManager.config.theme || 'light');
  logger.info('Settings applied to panel');

  panel.querySelectorAll('input[type="radio"][name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      uiManager.config.theme = (e.target as HTMLInputElement).value;
      uiManager.applyTheme(uiManager.config.theme);
      uiManager.saveConfig();
    });
  });

  const generalSettings = ['autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'];
  generalSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.general) uiManager.config.general = {} as any;
        (uiManager.config.general as any)[setting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
      });
    }
  });

  const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
  videoSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as any;
        (uiManager.config.videoUI as any)[setting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
  controlBarSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as any;
        if (!uiManager.config.videoUI.controlBar) uiManager.config.videoUI.controlBar = {} as any;

        const controlBarSetting = setting.replace('controlBar-', '');
        let value: string | boolean | number = (e.target as HTMLInputElement).value;

        if ((e.target as HTMLInputElement).type === 'checkbox') {
          value = (e.target as HTMLInputElement).checked;
        } else if (controlBarSetting === 'opacity') {
          value = parseFloat(value);
          const valueElement = panel.querySelector('#controlBar-opacity-value');
          if (valueElement) valueElement.textContent = `${value * 100}%`;
        }

        (uiManager.config.videoUI.controlBar as any)[controlBarSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
  playbackSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {} as any;
        if (!uiManager.config.videoUI.playback) uiManager.config.videoUI.playback = {} as any;

        const playbackSetting = setting.replace('playback-', '');
        let value: string | boolean = (e.target as HTMLInputElement).value;
        if ((e.target as HTMLInputElement).type === 'checkbox') value = (e.target as HTMLInputElement).checked;

        (uiManager.config.videoUI.playback as any)[playbackSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
  liveSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as any;
        const liveSetting = setting.replace('liveShow', 'show');
        (uiManager.config.liveUI as any)[liveSetting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
  danmakuSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as any;
        if (!uiManager.config.liveUI.danmaku) uiManager.config.liveUI.danmaku = {} as any;

        const danmakuSetting = setting.replace('danmaku-', '');
        let value: string | number = (e.target as HTMLInputElement).value;

        if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') {
          value = parseInt(value);
          if (danmakuSetting === 'fontSize') {
            const valueElement = panel.querySelector('#danmaku-fontSize-value');
            if (valueElement) valueElement.textContent = `${value}px`;
          }
        } else if (danmakuSetting === 'opacity') {
          value = parseFloat(value);
          const valueElement = panel.querySelector('#danmaku-opacity-value');
          if (valueElement) valueElement.textContent = `${value * 100}%`;
        }

        (uiManager.config.liveUI.danmaku as any)[danmakuSetting] = value;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const liveLayoutSelect = panel.querySelector('#live-layout') as HTMLSelectElement;
  if (liveLayoutSelect) {
    liveLayoutSelect.addEventListener('change', (e) => {
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as any;
      (uiManager.config.liveUI as any).layout = (e.target as HTMLSelectElement).value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const liveVolumeSlider = panel.querySelector('#live-volume') as HTMLInputElement;
  if (liveVolumeSlider) {
    liveVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      const valueElement = panel.querySelector('#live-volume-value');
      if (valueElement) valueElement.textContent = `${value}%`;
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {} as any;
      (uiManager.config.liveUI as any).volume = value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const advancedSettings = ['advanced-debugMode', 'advanced-performanceMode'];
  advancedSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.advanced) uiManager.config.advanced = {} as any;
        const advancedSetting = setting.replace('advanced-', '');
        (uiManager.config.advanced as any)[advancedSetting] = (e.target as HTMLInputElement).checked;
        uiManager.saveConfig();
      });
    }
  });

  const customCSS = panel.querySelector('#advanced-customCSS') as HTMLTextAreaElement;
  if (customCSS) {
    customCSS.addEventListener('input', (e) => {
      if (!uiManager.config.advanced) uiManager.config.advanced = {} as any;
      (uiManager.config.advanced as any).customCSS = (e.target as HTMLTextAreaElement).value;
      uiManager.saveConfig();
    });
  }

  const addScriptBtn = panel.querySelector('#add-script');
  if (addScriptBtn) {
    addScriptBtn.addEventListener('click', () => {
      const scriptsList = panel.querySelector('#custom-scripts-list');
      if (scriptsList) {
        const index = scriptsList.children.length;
        const scriptItem = document.createElement('div');
        scriptItem.className = 'script-item';
        scriptItem.innerHTML = `
          <input type="text" data-index="${index}" placeholder="脚本URL或代码" />
          <button class="remove-script" data-index="${index}">删除</button>
        `;
        scriptsList.appendChild(scriptItem);

        const removeBtn = scriptItem.querySelector('.remove-script');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            scriptItem.remove();
            uiManager.saveConfig();
          });
        }

        const input = scriptItem.querySelector('input');
        if (input) {
          input.addEventListener('input', () => uiManager.saveConfig());
        }
      }
    });
  }

  const removeScriptBtns = panel.querySelectorAll('.remove-script');
  removeScriptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scriptItem = btn.closest('.script-item');
      if (scriptItem) {
        scriptItem.remove();
        uiManager.saveConfig();
      }
    });
  });

  const scriptInputs = panel.querySelectorAll('#custom-scripts-list .script-item input');
  scriptInputs.forEach(input => {
    input.addEventListener('input', () => uiManager.saveConfig());
  });
}