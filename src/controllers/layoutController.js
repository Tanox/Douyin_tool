/**
 * 布局控制器模块
 * 提供页面布局的定制和管理功能，支持多种预定义布局和自定义布局配置
 */

import { logger } from '../utils/logger.js';
import { getElement, getElements, createElement } from '../utils/dom.js';
import elementController from './elementController.js';

// 预定义布局配置
const PREDEFINED_LAYOUTS = {
  // 紧凑布局 - 最小化界面元素，最大化内容显示区域
  compact: {
    name: 'compact',
    label: '紧凑布局',
    description: '最小化界面元素，最大化内容显示区域',
    rules: [
      { selector: '.sidebar, .menu, .navigation', action: 'hide' },
      { selector: '.header, .top-bar', styles: { height: '40px', padding: '5px 10px' } },
      { selector: '.footer, .bottom-bar', styles: { height: '30px', padding: '5px' } },
      { selector: '.content, .main-content', styles: { padding: '10px' } },
      { selector: '.card, .video-card', styles: { margin: '5px', borderRadius: '4px' } }
    ]
  },
  
  // 全屏布局 - 隐藏所有非必要元素，专注于内容
  fullscreen: {
    name: 'fullscreen',
    label: '全屏布局',
    description: '隐藏所有非必要元素，专注于内容',
    rules: [
      { selector: '.sidebar, .menu, .navigation, .header, .footer', action: 'hide' },
      { selector: '.content, .main-content', styles: { padding: '0', margin: '0' } },
      { selector: '.video-player, video', styles: { width: '100%', height: '100vh' } }
    ]
  },
  
  // 默认布局 - 标准的三栏布局
  standard: {
    name: 'standard',
    label: '标准布局',
    description: '标准的三栏布局，包含侧边栏、主内容区和信息面板',
    rules: [
      { selector: '.sidebar, .left-sidebar', styles: { width: '240px', display: 'block' } },
      { selector: '.main-content', styles: { marginLeft: '240px', marginRight: '300px' } },
      { selector: '.right-sidebar, .info-panel', styles: { width: '300px', display: 'block' } },
      { selector: '.header, .footer', styles: { display: 'block' } }
    ]
  },
  
  // 阅读模式 - 优化文本阅读体验
  reader: {
    name: 'reader',
    label: '阅读模式',
    description: '优化文本阅读体验，移除干扰元素',
    rules: [
      { selector: '.sidebar, .advertisement, .recommendations', action: 'hide' },
      { selector: '.content, .article, .post', styles: { maxWidth: '800px', margin: '0 auto', padding: '20px' } },
      { selector: 'p', styles: { fontSize: '18px', lineHeight: '1.8' } },
      { selector: 'h1, h2, h3', styles: { marginTop: '30px', marginBottom: '15px' } }
    ]
  },
  
  // 视频模式 - 优化视频观看体验
  video: {
    name: 'video',
    label: '视频模式',
    description: '优化视频观看体验，最大化视频区域',
    rules: [
      { selector: '.sidebar, .recommendations, .comments', action: 'hide' },
      { selector: '.video-container, .player-container', styles: { width: '100%', maxWidth: '1200px', margin: '0 auto' } },
      { selector: '.video-player, video', styles: { width: '100%', height: 'auto', aspectRatio: '16/9' } },
      { selector: '.video-info', styles: { maxWidth: '800px', margin: '20px auto' } }
    ]
  }
};

/**
 * 布局控制器类
 */
class LayoutController {
  /**
   * 构造函数
   */
  constructor() {
    this.layouts = { ...PREDEFINED_LAYOUTS };
    this.currentLayout = null;
    this.customLayouts = {};
    this.layoutPrefix = 'douyin_ui_customizer_layout_';
    
    // 初始化时从存储加载自定义布局
    this._loadCustomLayouts();
    
    logger.info('LayoutController 初始化成功');
  }

  /**
   * 应用预定义的布局模板到当前页面
   * @param {String} layoutName - 布局名称，必须是预定义布局之一
   * @returns {Promise<Boolean>} 应用是否成功
   */
  async applyLayout(layoutName) {
    try {
      // 验证布局名称
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局 ${layoutName} 不存在`);
        return false;
      }

      logger.info(`开始应用布局: ${layout.label}`);

      // 首先重置所有元素样式
      await this.resetLayout();

      // 应用布局规则
      for (const rule of layout.rules) {
        if (rule.action === 'hide') {
          await elementController.hideElement(rule.selector);
        } else if (rule.styles) {
          elementController.modifyElementStyle(rule.selector, rule.styles);
        }
      }

      // 更新当前布局
      this.currentLayout = layoutName;
      
      // 保存当前布局设置
      localStorage.setItem(`${this.layoutPrefix}current`, layoutName);
      
      // 添加布局类到body
      document.body.classList.remove(
        ...Object.keys(this.layouts).map(l => `douyin-ui-customizer-layout-${l}`)
      );
      document.body.classList.add(`douyin-ui-customizer-layout-${layoutName}`);

      logger.info(`布局应用成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`应用布局失败 (${layoutName}):`, error);
      return false;
    }
  }

  /**
   * 保存用户自定义布局配置，可在后续应用或分享给其他用户
   * @param {String} layoutName - 布局名称，必须唯一且不为空
   * @param {Object} layoutConfig - 布局配置对象，包含各页面元素的位置、大小等信息
   * @returns {Boolean} 保存是否成功
   */
  saveLayout(layoutName, layoutConfig) {
    try {
      // 验证参数
      if (!layoutName || typeof layoutName !== 'string' || layoutName.trim() === '') {
        throw new Error('布局名称不能为空');
      }

      if (!layoutConfig || typeof layoutConfig !== 'object') {
        throw new Error('布局配置必须是有效的对象');
      }

      // 不允许覆盖预定义布局
      if (PREDEFINED_LAYOUTS[layoutName]) {
        throw new Error('不能覆盖预定义布局');
      }

      // 创建布局配置
      const layout = {
        name: layoutName,
        label: layoutConfig.label || layoutName,
        description: layoutConfig.description || '自定义布局',
        rules: layoutConfig.rules || [],
        isCustom: true,
        createdAt: new Date().toISOString()
      };

      // 保存布局
      this.layouts[layoutName] = layout;
      this.customLayouts[layoutName] = layout;
      
      // 持久化保存
      this._saveCustomLayouts();

      logger.info(`自定义布局保存成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`保存布局失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有可用的布局
   * @returns {Array<Object>} 布局对象数组
   */
  getAvailableLayouts() {
    return Object.values(this.layouts);
  }

  /**
   * 获取当前应用的布局名称
   * @returns {String|null} 当前布局名称
   */
  getCurrentLayout() {
    return this.currentLayout;
  }

  /**
   * 重置布局为默认状态
   * @returns {Promise<Boolean>} 重置是否成功
   */
  async resetLayout() {
    try {
      // 移除所有布局类
      Object.keys(this.layouts).forEach(layoutName => {
        document.body.classList.remove(`douyin-ui-customizer-layout-${layoutName}`);
      });

      // 重置所有可能被布局修改过的元素
      const allSelectors = new Set();
      Object.values(this.layouts).forEach(layout => {
        layout.rules.forEach(rule => {
          if (rule.selector) {
            // 解析可能包含多个选择器的字符串
            rule.selector.split(',').forEach(selector => {
              allSelectors.add(selector.trim());
            });
          }
        });
      });

      // 重置每个选择器匹配的元素
      for (const selector of allSelectors) {
        await elementController.showElement(selector);
        elementController.resetElementStyle(selector);
      }

      // 清除当前布局
      this.currentLayout = null;
      localStorage.removeItem(`${this.layoutPrefix}current`);

      logger.info('布局已重置');
      return true;
    } catch (error) {
      logger.error('重置布局失败:', error);
      return false;
    }
  }

  /**
   * 删除自定义布局
   * @param {String} layoutName - 布局名称
   * @returns {Boolean} 删除是否成功
   */
  deleteLayout(layoutName) {
    try {
      // 不允许删除预定义布局
      if (PREDEFINED_LAYOUTS[layoutName]) {
        logger.warn(`不能删除预定义布局: ${layoutName}`);
        return false;
      }

      // 检查布局是否存在
      if (!this.customLayouts[layoutName]) {
        logger.warn(`自定义布局不存在: ${layoutName}`);
        return false;
      }

      // 如果正在使用要删除的布局，则重置布局
      if (this.currentLayout === layoutName) {
        this.resetLayout();
      }

      // 删除布局
      delete this.layouts[layoutName];
      delete this.customLayouts[layoutName];
      
      // 更新存储
      this._saveCustomLayouts();

      logger.info(`布局删除成功: ${layoutName}`);
      return true;
    } catch (error) {
      logger.error(`删除布局失败:`, error);
      return false;
    }
  }

  /**
   * 导出布局配置
   * @param {String} layoutName - 布局名称
   * @returns {String|null} JSON格式的布局配置
   */
  exportLayout(layoutName) {
    try {
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局不存在: ${layoutName}`);
        return null;
      }

      return JSON.stringify(layout, null, 2);
    } catch (error) {
      logger.error(`导出布局失败:`, error);
      return null;
    }
  }

  /**
   * 导入布局配置
   * @param {String} layoutJson - JSON格式的布局配置
   * @returns {Boolean} 导入是否成功
   */
  importLayout(layoutJson) {
    try {
      const layout = JSON.parse(layoutJson);
      
      // 验证布局配置
      if (!layout.name || !layout.rules || !Array.isArray(layout.rules)) {
        throw new Error('无效的布局配置格式');
      }

      // 确保是自定义布局
      layout.isCustom = true;
      layout.importedAt = new Date().toISOString();

      // 保存布局
      this.layouts[layout.name] = layout;
      this.customLayouts[layout.name] = layout;
      
      // 持久化保存
      this._saveCustomLayouts();

      logger.info(`布局导入成功: ${layout.label || layout.name}`);
      return true;
    } catch (error) {
      logger.error(`导入布局失败:`, error);
      return false;
    }
  }

  /**
   * 从本地存储加载自定义布局
   * @private
   */
  _loadCustomLayouts() {
    try {
      const savedLayouts = localStorage.getItem(`${this.layoutPrefix}custom`);
      if (savedLayouts) {
        const layouts = JSON.parse(savedLayouts);
        
        // 合并自定义布局
        Object.entries(layouts).forEach(([name, layout]) => {
          if (!PREDEFINED_LAYOUTS[name]) {
            this.layouts[name] = layout;
            this.customLayouts[name] = layout;
          }
        });
        
        logger.info(`成功加载 ${Object.keys(layouts).length} 个自定义布局`);
      }
    } catch (error) {
      logger.error('加载自定义布局失败:', error);
    }
  }

  /**
   * 保存自定义布局到本地存储
   * @private
   */
  _saveCustomLayouts() {
    try {
      localStorage.setItem(`${this.layoutPrefix}custom`, JSON.stringify(this.customLayouts));
    } catch (error) {
      logger.error('保存自定义布局失败:', error);
    }
  }
}

// 创建并导出布局控制器实例
const layoutController = new LayoutController();

export { LayoutController };
export default layoutController;