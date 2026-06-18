import { createElement, injectStyle, escapeHtml } from '../../utils/dom';
import logger from '../../utils/logger';
import type { Config } from '../../config';

export function createSettingsPanelContent(config: Config): string {
  return `
    <div class="panel-header">
      <h2>抖音UI定制设置</h2>
      <button class="close-btn">×</button>
    </div>
    <div class="panel-content">
      <div class="settings-tabs">
        <div>
          <button class="tab-btn active" data-tab="general">通用设置</button>
          <button class="tab-btn" data-tab="video">短视频设置</button>
        </div>
        <div>
          <button class="tab-btn" data-tab="live">直播间设置</button>
          <button class="tab-btn" data-tab="advanced">高级设置</button>
        </div>
        <div>
          <button class="tab-btn" data-tab="auto-executor">自动执行</button>
          <button class="tab-btn" data-tab="import-export">导入导出</button>
        </div>
      </div>
      
      <div class="tab-content active" id="general-tab">
        ${createGeneralSettings(config)}
      </div>
      
      <div class="tab-content" id="video-tab">
        ${createVideoSettings(config)}
      </div>
      
      <div class="tab-content" id="live-tab">
        ${createLiveSettings(config)}
      </div>
      
      <div class="tab-content" id="auto-executor-tab">
        ${createAutoExecutorSettings()}
      </div>
      
      <div class="tab-content" id="import-export-tab">
        ${createImportExportSettings()}
      </div>
      
      <div class="tab-content" id="advanced-tab">
        ${createAdvancedSettings(config)}
      </div>
    </div>
    <div class="panel-footer">
      <div>
        <button class="save-btn">保存设置</button>
        <button class="reset-btn">重置为默认</button>
      </div>
    </div>
  `;
}

export function createGeneralSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>主题设置</h3>
      <label>
        <input type="radio" name="theme" value="light" ${config.theme === 'light' ? 'checked' : ''} />
        浅色主题
      </label>
      <label>
        <input type="radio" name="theme" value="dark" ${config.theme === 'dark' ? 'checked' : ''} />
        深色主题
      </label>
    </div>
    
    <div class="setting-group">
      <h3>播放设置</h3>
      <label>
        <input type="checkbox" id="autoPlay" ${config.general?.autoPlay ? 'checked' : ''} />
        自动播放视频
      </label>
      <label>
        <input type="checkbox" id="autoScroll" ${config.general?.autoScroll ? 'checked' : ''} />
        自动滚动到下一个视频
      </label>
    </div>
    
    <div class="setting-group">
      <h3>功能设置</h3>
      <label>
        <input type="checkbox" id="keyboardShortcuts" ${config.general?.keyboardShortcuts ? 'checked' : ''} />
        启用键盘快捷键
      </label>
      <label>
        <input type="checkbox" id="notifications" ${config.general?.notifications ? 'checked' : ''} />
        启用通知提醒
      </label>
    </div>
  `;
}

export function createVideoSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>显示元素</h3>
      <label>
        <input type="checkbox" id="showLikeButton" ${config.videoUI?.showLikeButton ?? true ? 'checked' : ''} />
        显示点赞按钮
      </label>
      <label>
        <input type="checkbox" id="showCommentButton" ${config.videoUI?.showCommentButton ?? true ? 'checked' : ''} />
        显示评论按钮
      </label>
      <label>
        <input type="checkbox" id="showShareButton" ${config.videoUI?.showShareButton ?? true ? 'checked' : ''} />
        显示分享按钮
      </label>
      <label>
        <input type="checkbox" id="showAuthorInfo" ${config.videoUI?.showAuthorInfo ?? true ? 'checked' : ''} />
        显示作者信息
      </label>
      <label>
        <input type="checkbox" id="showMusicInfo" ${config.videoUI?.showMusicInfo ?? true ? 'checked' : ''} />
        显示音乐信息
      </label>
      <label>
        <input type="checkbox" id="showDescription" ${config.videoUI?.showDescription ?? true ? 'checked' : ''} />
        显示视频描述
      </label>
      <label>
        <input type="checkbox" id="showRecommendations" ${config.videoUI?.showRecommendations ?? true ? 'checked' : ''} />
        显示推荐视频
      </label>
    </div>
    
    <div class="setting-group">
      <h3>控制栏设置</h3>
      <label>
        <input type="checkbox" id="controlBar-show" ${config.videoUI?.controlBar?.show ?? true ? 'checked' : ''} />
        显示控制栏
      </label>
      <label>
        <input type="checkbox" id="controlBar-autoHide" ${config.videoUI?.controlBar?.autoHide ?? true ? 'checked' : ''} />
        自动隐藏控制栏
      </label>
      <label>
        <select id="controlBar-position">
          <option value="bottom" ${config.videoUI?.controlBar?.position === 'bottom' ? 'selected' : ''}>底部</option>
          <option value="top" ${config.videoUI?.controlBar?.position === 'top' ? 'selected' : ''}>顶部</option>
        </select>
        控制栏位置
      </label>
      <label>
        <select id="controlBar-size">
          <option value="small" ${config.videoUI?.controlBar?.size === 'small' ? 'selected' : ''}>小</option>
          <option value="medium" ${config.videoUI?.controlBar?.size === 'medium' ? 'selected' : ''}>中</option>
          <option value="large" ${config.videoUI?.controlBar?.size === 'large' ? 'selected' : ''}>大</option>
        </select>
        控制栏大小
      </label>
      <label>
        <input type="range" id="controlBar-opacity" min="0.1" max="1" step="0.1" value="${config.videoUI?.controlBar?.opacity ?? 0.9}" />
        控制栏透明度: <span id="controlBar-opacity-value">${(config.videoUI?.controlBar?.opacity ?? 0.9) * 100}%</span>
      </label>
    </div>
    
    <div class="setting-group">
      <h3>播放设置</h3>
      <label>
        <select id="playback-defaultQuality">
          <option value="auto" ${config.videoUI?.playback?.defaultQuality === 'auto' ? 'selected' : ''}>自动</option>
          <option value="low" ${config.videoUI?.playback?.defaultQuality === 'low' ? 'selected' : ''}>低画质</option>
          <option value="medium" ${config.videoUI?.playback?.defaultQuality === 'medium' ? 'selected' : ''}>中画质</option>
          <option value="high" ${config.videoUI?.playback?.defaultQuality === 'high' ? 'selected' : ''}>高画质</option>
          <option value="ultra" ${config.videoUI?.playback?.defaultQuality === 'ultra' ? 'selected' : ''}>超清</option>
        </select>
        默认画质
      </label>
      <label>
        <input type="checkbox" id="playback-autoPlay" ${config.videoUI?.playback?.autoPlay ?? true ? 'checked' : ''} />
        自动播放
      </label>
      <label>
        <input type="checkbox" id="playback-loop" ${config.videoUI?.playback?.loop ?? false ? 'checked' : ''} />
        循环播放
      </label>
    </div>
  `;
}

export function createLiveSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>显示元素</h3>
      <label>
        <input type="checkbox" id="liveShowGifts" ${config.liveUI?.showGifts ?? true ? 'checked' : ''} />
        显示礼物
      </label>
      <label>
        <input type="checkbox" id="liveShowDanmaku" ${config.liveUI?.showDanmaku ?? true ? 'checked' : ''} />
        显示弹幕
      </label>
      <label>
        <input type="checkbox" id="liveShowRecommendations" ${config.liveUI?.showRecommendations ?? true ? 'checked' : ''} />
        显示推荐
      </label>
      <label>
        <input type="checkbox" id="liveShowAds" ${config.liveUI?.showAds ?? false ? 'checked' : ''} />
        显示广告
      </label>
      <label>
        <input type="checkbox" id="liveShowStats" ${config.liveUI?.showStats ?? true ? 'checked' : ''} />
        显示统计信息
      </label>
    </div>
    
    <div class="setting-group">
      <h3>弹幕设置</h3>
      <label>
        <input type="range" id="danmaku-fontSize" min="12" max="36" step="1" value="${config.liveUI?.danmaku?.fontSize ?? 16}" />
        弹幕字体大小: <span id="danmaku-fontSize-value">${config.liveUI?.danmaku?.fontSize ?? 16}px</span>
      </label>
      <label>
        <input type="color" id="danmaku-color" value="${config.liveUI?.danmaku?.color ?? '#FFFFFF'}" />
        弹幕颜色
      </label>
      <label>
        <input type="range" id="danmaku-opacity" min="0.1" max="1" step="0.1" value="${config.liveUI?.danmaku?.opacity ?? 0.8}" />
        弹幕透明度: <span id="danmaku-opacity-value">${(config.liveUI?.danmaku?.opacity ?? 0.8) * 100}%</span>
      </label>
      <label>
        <select id="danmaku-speed">
          <option value="fast" ${config.liveUI?.danmaku?.speed === 'fast' ? 'selected' : ''}>快</option>
          <option value="medium" ${config.liveUI?.danmaku?.speed === 'medium' ? 'selected' : ''}>中</option>
          <option value="slow" ${config.liveUI?.danmaku?.speed === 'slow' ? 'selected' : ''}>慢</option>
        </select>
        弹幕速度
      </label>
      <label>
        <select id="danmaku-position">
          <option value="top" ${config.liveUI?.danmaku?.position === 'top' ? 'selected' : ''}>顶部</option>
          <option value="middle" ${config.liveUI?.danmaku?.position === 'middle' ? 'selected' : ''}>中部</option>
          <option value="bottom" ${config.liveUI?.danmaku?.position === 'bottom' ? 'selected' : ''}>底部</option>
        </select>
        弹幕位置
      </label>
      <label>
        <input type="number" id="danmaku-maxLines" min="1" max="10" value="${config.liveUI?.danmaku?.maxLines ?? 5}" />
        最大弹幕行数
      </label>
    </div>
    
    <div class="setting-group">
      <h3>布局设置</h3>
      <label>
        <select id="live-layout">
          <option value="default" ${config.liveUI?.layout === 'default' ? 'selected' : ''}>默认</option>
          <option value="minimal" ${config.liveUI?.layout === 'minimal' ? 'selected' : ''}>极简</option>
          <option value="immersive" ${config.liveUI?.layout === 'immersive' ? 'selected' : ''}>沉浸</option>
        </select>
        布局类型
      </label>
    </div>
    
    <div class="setting-group">
      <h3>音量设置</h3>
      <label>
        <input type="range" id="live-volume" min="0" max="100" step="5" value="${config.liveUI?.volume ?? 100}" />
        音量: <span id="live-volume-value">${config.liveUI?.volume ?? 100}%</span>
      </label>
    </div>
  `;
}

export function createImportExportSettings(): string {
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

export function createAdvancedSettings(config: Config): string {
  return `
    <div class="setting-group">
      <h3>高级功能</h3>
      <label>
        <input type="checkbox" id="advanced-debugMode" ${config.advanced?.debugMode ?? false ? 'checked' : ''} />
        启用调试模式
      </label>
      <label>
        <input type="checkbox" id="advanced-performanceMode" ${config.advanced?.performanceMode ?? false ? 'checked' : ''} />
        启用性能模式
      </label>
    </div>
    
    <div class="setting-group">
      <h3>自定义CSS</h3>
      <textarea id="advanced-customCSS" placeholder="输入自定义CSS代码" rows="5" cols="40">${escapeHtml(config.advanced?.customCSS ?? '')}</textarea>
      <small>注意：自定义CSS可能会影响页面性能</small>
    </div>

    <div class="setting-group">
      <h3>自定义脚本</h3>
      <div id="custom-scripts-list">
        ${(config.advanced?.customScripts ?? []).map((script: string, index: number) => `
          <div class="script-item">
            <input type="text" value="${escapeHtml(script)}" data-index="${String(index)}" placeholder="脚本URL或代码" />
            <button class="remove-script" data-index="${String(index)}">删除</button>
          </div>
        `).join('')}
      </div>
      <button id="add-script">添加脚本</button>
      <small>注意：自定义脚本可能会带来安全风险，请谨慎使用</small>
    </div>
  `;
}

export function createAutoExecutorSettings(): string {
  return `
    <div class="setting-group">
      <h3>自动执行控制器</h3>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="auto-executor-enable" />
          <span class="slider"></span>
        </label>
        <span>启用自动执行控制器</span>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>控制中心</h3>
      <div class="button-group">
        <div>
          <button id="auto-executor-start" class="ui-button primary">开始执行</button>
          <button id="auto-executor-stop" class="ui-button secondary">停止执行</button>
        </div>
        <button id="auto-executor-emergency" class="ui-button danger">紧急停止</button>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>配置选项</h3>
      <div class="setting-item">
        <label for="check-interval">检查间隔（毫秒）:</label>
        <input type="number" id="check-interval" value="1000" min="500" max="10000" />
      </div>
      <div class="setting-item">
        <label for="max-attempts">最大重试次数:</label>
        <input type="number" id="max-attempts" value="10" min="1" max="50" />
      </div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="enable-logging" />
          <span class="slider"></span>
        </label>
        <span>启用日志记录</span>
      </div>
      <div class="setting-item">
        <label class="switch">
          <input type="checkbox" id="require-confirmation" />
          <span class="slider"></span>
        </label>
        <span>需要确认</span>
      </div>
    </div>
    
    <div class="setting-group">
      <h3>执行状态</h3>
      <div class="status-info">
        <div><strong>状态:</strong> <span id="executor-status">未运行</span></div>
        <div><strong>当前尝试:</strong> <span id="current-attempt">0</span></div>
        <div><strong>历史记录:</strong> <span id="execution-history">0</span></div>
      </div>
    </div>
  `;
}

export function injectPanelStyles(): void {
  injectStyle(`
    .douyin-ui-customizer-panel {
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `);
}