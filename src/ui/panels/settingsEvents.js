// src/ui/panels/settingsEvents.js

import logger from '../../utils/logger.js';
import eventEmitter from '../../utils/eventEmitter.js';

export function setupSettingsPanelEvents(panel, uiManager) {
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
        if (typeof window.resetConfig === 'function') {
          uiManager.config = window.resetConfig();
        }
        panel.remove();
        location.reload();
      }
    });
  }

  initImportExport(panel, uiManager);
  setupAutoExecutorEvents(panel, uiManager);
}

function initImportExport(panel, uiManager) {
  if (!panel) return;

  const exportBtn = panel.querySelector('#exportBtn');
  const exportConfig = panel.querySelector('#exportConfig');
  const copyBtn = panel.querySelector('#copyBtn');

  if (exportBtn && exportConfig) {
    exportBtn.addEventListener('click', () => {
      try {
        import('../../config.js').then(({ default: configManager }) => {
          const exportedConfig = configManager.exportConfig();
          exportConfig.value = exportedConfig;
        }).catch(error => {
          logger.error('导入配置管理模块失败:', error);
          exportConfig.value = JSON.stringify(uiManager.config, null, 2);
        });
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
  const importConfig = panel.querySelector('#importConfig');

  if (importBtn && importConfig) {
    importBtn.addEventListener('click', () => {
      try {
        import('../../config.js').then(({ default: configManager }) => {
          const success = configManager.importConfig(importConfig.value);
          if (success) {
            uiManager.config = configManager.getConfig();
            alert('配置导入成功');
            location.reload();
          } else {
            alert('导入配置失败，请检查JSON格式');
          }
        }).catch(error => {
          logger.error('导入配置管理模块失败:', error);
          try {
            const newConfig = JSON.parse(importConfig.value);
            if (configManager && typeof configManager.validateConfig === 'function') {
              const validationResult = configManager.validateConfig(newConfig);
              if (validationResult.valid) {
                uiManager.config = newConfig;
                uiManager.saveConfig();
                alert('配置导入成功');
                location.reload();
              } else {
                alert('配置格式验证失败: ' + validationResult.issues.join('\n'));
              }
            } else {
              uiManager.config = newConfig;
              uiManager.saveConfig();
              alert('配置导入成功（跳过验证）');
              location.reload();
            }
          } catch (parseError) {
            logger.error('JSON解析失败:', parseError);
            alert('JSON格式错误，请检查配置内容');
          }
        });
      } catch (error) {
        logger.error('导入配置失败:', error);
        alert('导入配置失败，请检查JSON格式');
      }
    });
  }
}

export function setupAutoExecutorEvents(panel, uiManager) {
  const autoExecutorTab = panel.querySelector('#auto-executor-tab');
  if (!autoExecutorTab) return;

  const enableSwitch = autoExecutorTab.querySelector('#auto-executor-enable');
  if (enableSwitch) {
    enableSwitch.addEventListener('change', (e) => {
      uiManager.config.autoExecutorEnabled = e.target.checked;
      uiManager.saveConfig();
    });
  }

  const startBtn = autoExecutorTab.querySelector('#auto-executor-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const interval = parseInt(autoExecutorTab.querySelector('#check-interval').value) || 5000;
      const maxRetries = parseInt(autoExecutorTab.querySelector('#max-attempts').value) || 3;
      const enableLogging = autoExecutorTab.querySelector('#enable-logging').checked;
      const requireConfirmation = autoExecutorTab.querySelector('#require-confirmation').checked;

      uiManager.config.autoExecutorConfig = {
        checkInterval: interval,
        maxRetries: maxRetries,
        enableLogging: enableLogging,
        requireConfirmation: requireConfirmation
      };
      uiManager.saveConfig();

      uiManager.autoExecutor.start(uiManager.config.autoExecutorConfig);
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const stopBtn = autoExecutorTab.querySelector('#auto-executor-stop');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      uiManager.autoExecutor.stop();
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const emergencyStopBtn = autoExecutorTab.querySelector('#auto-executor-emergency');
  if (emergencyStopBtn) {
    emergencyStopBtn.addEventListener('click', () => {
      uiManager.autoExecutor.emergencyStop();
      updateAutoExecutorStatus(panel, uiManager.autoExecutor);
    });
  }

  const configInputs = autoExecutorTab.querySelectorAll('.setting-item input');
  configInputs.forEach(input => {
    input.addEventListener('change', () => {
      const interval = parseInt(autoExecutorTab.querySelector('#check-interval').value) || 5000;
      const maxRetries = parseInt(autoExecutorTab.querySelector('#max-attempts').value) || 3;
      const enableLogging = autoExecutorTab.querySelector('#enable-logging').checked;
      const requireConfirmation = autoExecutorTab.querySelector('#require-confirmation').checked;

      uiManager.config.autoExecutorConfig = {
        checkInterval: interval,
        maxRetries: maxRetries,
        enableLogging: enableLogging,
        requireConfirmation: requireConfirmation
      };
      uiManager.saveConfig();
    });
  });

  uiManager.autoExecutorStatusInterval = setInterval(() => {
    updateAutoExecutorStatus(panel, uiManager.autoExecutor);
  }, 1000);
}

export function updateAutoExecutorStatus(panel, autoExecutor) {
  const autoExecutorTab = panel.querySelector('#auto-executor-tab');
  if (!autoExecutorTab) return;

  const statusElement = autoExecutorTab.querySelector('#executor-status');
  const currentAttemptElement = autoExecutorTab.querySelector('#current-attempt');
  const historyElement = autoExecutorTab.querySelector('#execution-history');

  if (statusElement) {
    statusElement.textContent = autoExecutor.isRunning() ? '运行中' : '已停止';
    statusElement.className = autoExecutor.isRunning() ? 'status-running' : 'status-stopped';
  }

  if (currentAttemptElement) {
    currentAttemptElement.textContent = `当前尝试: ${autoExecutor.getCurrentAttempt()}`;
  }

  if (historyElement) {
    const history = autoExecutor.getExecutionHistory();
    historyElement.innerHTML = history.slice(-10).map((entry, index) => {
      const statusClass = entry.success ? 'success' : 'failed';
      return `<div class="history-entry ${statusClass}">${new Date(entry.timestamp).toLocaleTimeString()} - ${entry.action} (${entry.success ? '成功' : '失败'})</div>`;
    }).join('');
  }
}

export function applySettingsToPanel(uiManager) {
  const panel = uiManager.settingsPanel;
  if (!panel) return;

  uiManager.applyTheme(uiManager.config.theme || 'light');
  logger.info('Settings applied to panel');

  panel.querySelectorAll('input[type="radio"][name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      uiManager.config.theme = e.target.value;
      uiManager.applyTheme(uiManager.config.theme);
      uiManager.saveConfig();
    });
  });

  const generalSettings = ['autoPlay', 'autoScroll', 'keyboardShortcuts', 'notifications'];
  generalSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.general) uiManager.config.general = {};
        uiManager.config.general[setting] = e.target.checked;
        uiManager.saveConfig();
      });
    }
  });

  const videoSettings = ['showLikeButton', 'showCommentButton', 'showShareButton', 'showAuthorInfo', 'showMusicInfo', 'showDescription', 'showRecommendations'];
  videoSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {};
        uiManager.config.videoUI[setting] = e.target.checked;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const controlBarSettings = ['controlBar-show', 'controlBar-autoHide', 'controlBar-position', 'controlBar-size', 'controlBar-opacity'];
  controlBarSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`);
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {};
        if (!uiManager.config.videoUI.controlBar) uiManager.config.videoUI.controlBar = {};

        const controlBarSetting = setting.replace('controlBar-', '');
        let value = e.target.value;

        if (e.target.type === 'checkbox') {
          value = e.target.checked;
        } else if (controlBarSetting === 'opacity') {
          value = parseFloat(value);
          panel.querySelector('#controlBar-opacity-value').textContent = `${value * 100}%`;
        }

        uiManager.config.videoUI.controlBar[controlBarSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const playbackSettings = ['playback-defaultQuality', 'playback-autoPlay', 'playback-loop'];
  playbackSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`);
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.videoUI) uiManager.config.videoUI = {};
        if (!uiManager.config.videoUI.playback) uiManager.config.videoUI.playback = {};

        const playbackSetting = setting.replace('playback-', '');
        let value = e.target.value;
        if (e.target.type === 'checkbox') value = e.target.checked;

        uiManager.config.videoUI.playback[playbackSetting] = value;
        uiManager.saveConfig();
        uiManager.applyVideoCustomizations();
      });
    }
  });

  const liveSettings = ['liveShowGifts', 'liveShowDanmaku', 'liveShowRecommendations', 'liveShowAds', 'liveShowStats'];
  liveSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {};
        const liveSetting = setting.replace('liveShow', 'show');
        uiManager.config.liveUI[liveSetting] = e.target.checked;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const danmakuSettings = ['danmaku-fontSize', 'danmaku-color', 'danmaku-opacity', 'danmaku-speed', 'danmaku-position', 'danmaku-maxLines'];
  danmakuSettings.forEach(setting => {
    const element = panel.querySelector(`#${setting}`);
    if (element) {
      element.addEventListener('change', (e) => {
        if (!uiManager.config.liveUI) uiManager.config.liveUI = {};
        if (!uiManager.config.liveUI.danmaku) uiManager.config.liveUI.danmaku = {};

        const danmakuSetting = setting.replace('danmaku-', '');
        let value = e.target.value;

        if (danmakuSetting === 'fontSize' || danmakuSetting === 'maxLines') {
          value = parseInt(value);
          if (danmakuSetting === 'fontSize') {
            panel.querySelector('#danmaku-fontSize-value').textContent = `${value}px`;
          }
        } else if (danmakuSetting === 'opacity') {
          value = parseFloat(value);
          panel.querySelector('#danmaku-opacity-value').textContent = `${value * 100}%`;
        }

        uiManager.config.liveUI.danmaku[danmakuSetting] = value;
        uiManager.saveConfig();
        uiManager.applyLiveCustomizations();
      });
    }
  });

  const liveLayoutSelect = panel.querySelector('#live-layout');
  if (liveLayoutSelect) {
    liveLayoutSelect.addEventListener('change', (e) => {
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {};
      uiManager.config.liveUI.layout = e.target.value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const liveVolumeSlider = panel.querySelector('#live-volume');
  if (liveVolumeSlider) {
    liveVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      panel.querySelector('#live-volume-value').textContent = `${value}%`;
      if (!uiManager.config.liveUI) uiManager.config.liveUI = {};
      uiManager.config.liveUI.volume = value;
      uiManager.saveConfig();
      uiManager.applyLiveCustomizations();
    });
  }

  const advancedSettings = ['advanced-debugMode', 'advanced-performanceMode'];
  advancedSettings.forEach(setting => {
    const checkbox = panel.querySelector(`#${setting}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (!uiManager.config.advanced) uiManager.config.advanced = {};
        const advancedSetting = setting.replace('advanced-', '');
        uiManager.config.advanced[advancedSetting] = e.target.checked;
        uiManager.saveConfig();
      });
    }
  });

  const customCSS = panel.querySelector('#advanced-customCSS');
  if (customCSS) {
    customCSS.addEventListener('input', (e) => {
      if (!uiManager.config.advanced) uiManager.config.advanced = {};
      uiManager.config.advanced.customCSS = e.target.value;
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
          removeBtn.addEventListener('click', (e) => {
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
    btn.addEventListener('click', (e) => {
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
