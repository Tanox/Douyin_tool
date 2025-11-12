/**
 * 主题切换模块
 * 管理不同主题的样式定义和切换逻辑
 */

import logger from '../utils/logger.js';
import { injectStyle } from '../utils/dom.js';

// 默认主题配置
const DEFAULT_THEMES = {
  light: {
    name: 'light',
    label: '浅色模式',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8f9fa',
      '--bg-tertiary': '#e9ecef',
      '--text-primary': '#212529',
      '--text-secondary': '#6c757d',
      '--text-tertiary': '#adb5bd',
      '--border-color': '#dee2e6',
      '--accent-color': '#007bff',
      '--accent-hover': '#0056b3',
      '--danger-color': '#dc3545',
      '--success-color': '#28a745',
      '--warning-color': '#ffc107',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '--border-radius': '8px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.8',
      '--opacity-active': '0.6'
    }
  },
  dark: {
    name: 'dark',
    label: '深色模式',
    variables: {
      '--bg-primary': '#121212',
      '--bg-secondary': '#1e1e1e',
      '--bg-tertiary': '#2d2d2d',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b0b0b0',
      '--text-tertiary': '#6c6c6c',
      '--border-color': '#3c3c3c',
      '--accent-color': '#1976d2',
      '--accent-hover': '#1565c0',
      '--danger-color': '#f44336',
      '--success-color': '#4caf50',
      '--warning-color': '#ffc107',
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      '--border-radius': '8px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.8',
      '--opacity-active': '0.6'
    }
  },
  minimal: {
    name: 'minimal',
    label: '极简模式',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#fafafa',
      '--bg-tertiary': '#f5f5f5',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#666666',
      '--text-tertiary': '#999999',
      '--border-color': '#eeeeee',
      '--accent-color': '#333333',
      '--accent-hover': '#000000',
      '--danger-color': '#ff3b30',
      '--success-color': '#34c759',
      '--warning-color': '#ffcc00',
      '--shadow-sm': 'none',
      '--shadow-md': '0 1px 3px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 4px 6px rgba(0, 0, 0, 0.1)',
      '--border-radius': '4px',
      '--transition-speed': '0.2s',
      '--opacity-hover': '0.9',
      '--opacity-active': '0.8'
    }
  }
};

/**
 * 主题管理器类
 */
class ThemeManager {
  /**
   * 构造函数
   */
  constructor() {
    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = null;
    this.styleElement = null;
    this.themePrefix = 'douyin_ui_customizer_theme_';
  }

  /**
   * 初始化主题管理器
   */
  init() {
    try {
      // 尝试从存储中获取保存的主题
      const savedTheme = localStorage.getItem(`${this.themePrefix}current`);
      
      // 如果有保存的主题且存在，则应用
      if (savedTheme && this.themes[savedTheme]) {
        this.switchTheme(savedTheme);
      } else {
        // 否则使用默认主题（浅色）
        this.switchTheme('light');
      }
      
      logger.info('主题管理器初始化成功');
    } catch (error) {
      logger.error('主题管理器初始化失败:', error);
      // 失败时使用默认主题
      this.switchTheme('light');
    }
  }

  /**
   * 切换到指定主题
   * @param {string} themeName - 主题名称
   * @returns {boolean} 是否切换成功
   */
  switchTheme(themeName) {
    try {
      // 验证主题是否存在
      if (!this.themes[themeName]) {
        logger.warn(`主题 ${themeName} 不存在，使用默认主题`);
        themeName = 'light';
      }

      const theme = this.themes[themeName];
      
      // 生成CSS变量样式
      const cssVariables = Object.entries(theme.variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
      
      // 生成CSS
      const css = `:root {
  ${cssVariables}
}

/* 主题特定样式 */
.douyin-ui-customizer-theme-${themeName} {}
`;
      
      // 移除旧的样式元素
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      // 注入新的样式
      this.styleElement = injectStyle(css);
      
      // 更新当前主题
      this.currentTheme = themeName;
      
      // 保存主题设置
      localStorage.setItem(`${this.themePrefix}current`, themeName);
      
      // 添加主题类到body
      document.body.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      document.body.classList.add(`douyin-ui-customizer-theme-${themeName}`);
      
      logger.info(`主题切换到 ${theme.label} (${themeName})`);
      return true;
    } catch (error) {
      logger.error(`主题切换失败 (${themeName}):`, error);
      return false;
    }
  }

  /**
   * 获取当前主题名称
   * @returns {string} 当前主题名称
   */
  getCurrentTheme() {
    return this.currentTheme || 'light';
  }

  /**
   * 获取所有可用主题
   * @returns {Object[]} 主题对象数组
   */
  getAvailableThemes() {
    return Object.values(this.themes);
  }

  /**
   * 创建新的自定义主题
   * @param {Object} themeConfig - 主题配置对象，包含name、label、colors和fonts属性
   * @returns {String} 创建的主题ID
   */
  createTheme(themeConfig) {
    try {
      if (!themeConfig.name || !themeConfig.label) {
        throw new Error('主题配置必须包含name和label属性');
      }

      // 转换colors和fonts为CSS变量
      const variables = {};
      
      // 处理颜色变量
      if (themeConfig.colors) {
        Object.entries(themeConfig.colors).forEach(([key, value]) => {
          variables[`--${key}`] = value;
        });
      }
      
      // 处理字体变量
      if (themeConfig.fonts) {
        Object.entries(themeConfig.fonts).forEach(([key, value]) => {
          variables[`--font-${key}`] = value;
        });
      }

      // 注册新主题
      const theme = {
        name: themeConfig.name,
        label: themeConfig.label,
        variables: variables
      };

      this.registerTheme(theme);
      logger.info(`创建新主题成功: ${themeConfig.label}`);
      return themeConfig.name;
    } catch (error) {
      logger.error('创建主题失败:', error);
      return null;
    }
  }

  /**
   * 删除自定义主题
   * @param {String} themeName - 主题名称
   * @returns {Boolean} 删除是否成功
   */
  deleteTheme(themeName) {
    try {
      // 不允许删除默认主题
      if (DEFAULT_THEMES[themeName]) {
        logger.warn(`不能删除默认主题: ${themeName}`);
        return false;
      }

      // 检查主题是否存在
      if (!this.themes[themeName]) {
        logger.warn(`主题不存在: ${themeName}`);
        return false;
      }

      // 如果正在使用要删除的主题，则切换到默认主题
      if (this.currentTheme === themeName) {
        this.switchTheme('light');
      }

      // 删除主题
      delete this.themes[themeName];
      logger.info(`主题删除成功: ${themeName}`);
      return true;
    } catch (error) {
      logger.error(`删除主题失败 (${themeName}):`, error);
      return false;
    }
  }

  /**
   * 获取主题配置
   * @param {string} themeName - 主题名称
   * @returns {Object|null} 主题配置对象
   */
  getThemeConfig(themeName) {
    return this.themes[themeName] || null;
  }

  /**
   * 注册新主题
   * @param {Object} theme - 主题配置对象
   * @returns {boolean} 是否注册成功
   */
  registerTheme(theme) {
    try {
      if (!theme.name || !theme.variables) {
        throw new Error('主题配置必须包含name和variables属性');
      }
      
      // 验证变量格式
      if (typeof theme.variables !== 'object') {
        throw new Error('variables必须是对象');
      }
      
      this.themes[theme.name] = {
        name: theme.name,
        label: theme.label || theme.name,
        variables: { ...theme.variables }
      };
      
      logger.info(`新主题注册成功: ${theme.label || theme.name}`);
      return true;
    } catch (error) {
      logger.error('主题注册失败:', error);
      return false;
    }
  }

  /**
   * 导出主题配置
   * @param {string} themeName - 主题名称
   * @returns {string|null} JSON格式的主题配置
   */
  exportTheme(themeName) {
    try {
      const theme = this.themes[themeName];
      if (!theme) return null;
      
      return JSON.stringify(theme, null, 2);
    } catch (error) {
      logger.error(`主题导出失败 (${themeName}):`, error);
      return null;
    }
  }

  /**
   * 导入主题配置
   * @param {string} themeJson - JSON格式的主题配置
   * @returns {boolean} 是否导入成功
   */
  importTheme(themeJson) {
    try {
      const theme = JSON.parse(themeJson);
      return this.registerTheme(theme);
    } catch (error) {
      logger.error('主题导入失败:', error);
      return false;
    }
  }

  /**
   * 生成主题预览样式
   * @param {string} themeName - 主题名称
   * @returns {string|null} 预览样式字符串
   */
  generatePreviewStyle(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return Object.entries(theme.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  /**
   * 应用主题到特定元素
   * @param {HTMLElement} element - 目标元素
   * @param {string} themeName - 主题名称
   */
  applyThemeToElement(element, themeName) {
    try {
      const theme = this.themes[themeName];
      if (!theme || !element) return;
      
      // 应用CSS变量
      Object.entries(theme.variables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
      
      // 添加主题类
      element.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      element.classList.add(`douyin-ui-customizer-theme-${themeName}`);
    } catch (error) {
      logger.error(`应用主题到元素失败:`, error);
    }
  }

  /**
   * 重置所有主题设置
   */
  reset() {
    try {
      // 移除样式元素
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      // 移除主题类
      Object.keys(this.themes).forEach(themeName => {
        document.body.classList.remove(`douyin-ui-customizer-theme-${themeName}`);
      });
      
      // 重置主题配置
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = null;
      this.styleElement = null;
      
      // 清除存储
      localStorage.removeItem(`${this.themePrefix}current`);
      
      // 重新初始化
      this.init();
      
      logger.info('主题设置已重置');
    } catch (error) {
      logger.error('重置主题设置失败:', error);
    }
  }
}

// 创建并导出主题管理器实例
const themeManager = new ThemeManager();

export { ThemeManager };
export default themeManager;