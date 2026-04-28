import logger from '../utils/logger.ts';
import { injectStyle } from '../utils/dom.ts';

interface ThemeVariables {
  [key: string]: string;
}

interface Theme {
  name: string;
  label: string;
  variables: ThemeVariables;
}

const DEFAULT_THEMES: Record<string, Theme> = {
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

interface ThemeConfig {
  name: string;
  label: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
}

class ThemeManager {
  private themes: Record<string, Theme>;
  private currentTheme: string | null;
  private styleElement: HTMLStyleElement | null;
  private themePrefix: string;

  constructor() {
    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = null;
    this.styleElement = null;
    this.themePrefix = 'douyin_ui_customizer_theme_';
  }

  init(): void {
    try {
      const savedTheme = localStorage.getItem(`${this.themePrefix}current`);
      
      if (savedTheme && this.themes[savedTheme]) {
        this.switchTheme(savedTheme);
      } else {
        this.switchTheme('light');
      }
      
      logger.info('主题管理器初始化成功');
    } catch (error) {
      logger.error('主题管理器初始化失败:', error);
      this.switchTheme('light');
    }
  }

  switchTheme(themeName: string): boolean {
    try {
      if (!this.themes[themeName]) {
        logger.warn(`主题 ${themeName} 不存在，使用默认主题`);
        themeName = 'light';
      }

      const theme = this.themes[themeName];
      
      const cssVariables = Object.entries(theme.variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
      
      const css = `:root {
  ${cssVariables}
}

.douyin-ui-customizer-theme-${themeName} {}
`;
      
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      this.styleElement = injectStyle(css);
      
      this.currentTheme = themeName;
      
      localStorage.setItem(`${this.themePrefix}current`, themeName);
      
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

  getCurrentTheme(): string {
    return this.currentTheme || 'light';
  }

  getAvailableThemes(): Theme[] {
    return Object.values(this.themes);
  }

  createTheme(themeConfig: ThemeConfig): string | null {
    try {
      if (!themeConfig.name || !themeConfig.label) {
        throw new Error('主题配置必须包含name和label属性');
      }

      const variables: ThemeVariables = {};
      
      if (themeConfig.colors) {
        Object.entries(themeConfig.colors).forEach(([key, value]) => {
          variables[`--${key}`] = value;
        });
      }
      
      if (themeConfig.fonts) {
        Object.entries(themeConfig.fonts).forEach(([key, value]) => {
          variables[`--font-${key}`] = value;
        });
      }

      const theme: Theme = {
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

  deleteTheme(themeName: string): boolean {
    try {
      if (DEFAULT_THEMES[themeName]) {
        logger.warn(`不能删除默认主题: ${themeName}`);
        return false;
      }

      if (!this.themes[themeName]) {
        logger.warn(`主题不存在: ${themeName}`);
        return false;
      }

      if (this.currentTheme === themeName) {
        this.switchTheme('light');
      }

      delete this.themes[themeName];
      logger.info(`主题删除成功: ${themeName}`);
      return true;
    } catch (error) {
      logger.error(`删除主题失败 (${themeName}):`, error);
      return false;
    }
  }

  getTheme(themeName: string): Theme | null {
    return this.themes[themeName] || null;
  }

  registerTheme(theme: Theme): boolean {
    try {
      if (!theme.name || !theme.variables) {
        throw new Error('主题配置必须包含name和variables属性');
      }
      
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

  exportTheme(themeName: string): string | null {
    try {
      const theme = this.themes[themeName];
      if (!theme) return null;
      
      return JSON.stringify(theme, null, 2);
    } catch (error) {
      logger.error(`主题导出失败 (${themeName}):`, error);
      return null;
    }
  }

  importTheme(themeJson: string): boolean {
    try {
      const theme = JSON.parse(themeJson) as Theme;
      return this.registerTheme(theme);
    } catch (error) {
      logger.error('主题导入失败:', error);
      return false;
    }
  }

  generatePreviewStyle(themeName: string): string | null {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return Object.entries(theme.variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  applyThemeToElement(element: HTMLElement, themeName: string): void {
    try {
      const theme = this.themes[themeName];
      if (!theme || !element) return;
      
      Object.entries(theme.variables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
      
      element.classList.remove(
        ...Object.keys(this.themes).map(t => `douyin-ui-customizer-theme-${t}`)
      );
      element.classList.add(`douyin-ui-customizer-theme-${themeName}`);
    } catch (error) {
      logger.error(`应用主题到元素失败:`, error);
    }
  }

  reset(): void {
    try {
      if (this.styleElement && this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      
      Object.keys(this.themes).forEach(themeName => {
        document.body.classList.remove(`douyin-ui-customizer-theme-${themeName}`);
      });
      
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = null;
      this.styleElement = null;
      
      localStorage.removeItem(`${this.themePrefix}current`);
      
      this.init();
      
      logger.info('主题设置已重置');
    } catch (error) {
      logger.error('重置主题设置失败:', error);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (event === 'themeChanged') {
      const originalSwitchTheme = this.switchTheme.bind(this);
      this.switchTheme = (themeName: string): boolean => {
        const result = originalSwitchTheme(themeName);
        if (result) {
          callback(themeName);
        }
        return result;
      };
    }
  }

  applyTheme(themeName: string): Promise<boolean> {
    return Promise.resolve(this.switchTheme(themeName));
  }

  listThemes(): Theme[] {
    return this.getAvailableThemes();
  }
}

const themeManager = new ThemeManager();

export { ThemeManager };
export default themeManager;