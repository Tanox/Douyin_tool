/**
 * 样式模块入口
 * 导出所有样式相关功能，包括主题切换和自定义样式
 */

// 主题切换模块
export { ThemeManager } from './theme.js';
export { default as themeManager } from './theme.js';

/**
 * 样式集合
 * 提供所有样式相关功能的统一访问
 */
export const styles = {
  ThemeManager,
  themeManager
};

export default styles;