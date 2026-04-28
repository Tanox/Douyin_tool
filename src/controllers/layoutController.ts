import { logger } from '../utils/logger.ts';
import { getElement, getElements, createElement } from '../utils/dom.ts';
import elementController from './elementController.ts';

interface LayoutRule {
  selector: string;
  action?: 'hide';
  styles?: Record<string, string>;
}

interface Layout {
  name: string;
  label: string;
  description: string;
  rules: LayoutRule[];
  isCustom?: boolean;
  createdAt?: string;
  importedAt?: string;
}

const PREDEFINED_LAYOUTS: Record<string, Layout> = {
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

class LayoutController {
  private layouts: Record<string, Layout>;
  private currentLayout: string | null;
  private customLayouts: Record<string, Layout>;
  private layoutPrefix: string;

  constructor() {
    this.layouts = { ...PREDEFINED_LAYOUTS };
    this.currentLayout = null;
    this.customLayouts = {};
    this.layoutPrefix = 'douyin_ui_customizer_layout_';
    
    this._loadCustomLayouts();
    
    logger.info('LayoutController 初始化成功');
  }

  async applyLayout(layoutName: string): Promise<boolean> {
    try {
      const layout = this.layouts[layoutName];
      if (!layout) {
        logger.warn(`布局 ${layoutName} 不存在`);
        return false;
      }

      logger.info(`开始应用布局: ${layout.label}`);

      await this.resetLayout();

      for (const rule of layout.rules) {
        if (rule.action === 'hide') {
          await elementController.hideElement(rule.selector);
        } else if (rule.styles) {
          elementController.modifyElementStyle(rule.selector, rule.styles);
        }
      }

      this.currentLayout = layoutName;
      
      localStorage.setItem(`${this.layoutPrefix}current`, layoutName);
      
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

  saveLayout(layoutName: string, layoutConfig: Partial<Layout>): boolean {
    try {
      if (!layoutName || typeof layoutName !== 'string' || layoutName.trim() === '') {
        throw new Error('布局名称不能为空');
      }

      if (!layoutConfig || typeof layoutConfig !== 'object') {
        throw new Error('布局配置必须是有效的对象');
      }

      if (PREDEFINED_LAYOUTS[layoutName]) {
        throw new Error('不能覆盖预定义布局');
      }

      const layout: Layout = {
        name: layoutName,
        label: layoutConfig.label || layoutName,
        description: layoutConfig.description || '自定义布局',
        rules: layoutConfig.rules || [],
        isCustom: true,
        createdAt: new Date().toISOString()
      };

      this.layouts[layoutName] = layout;
      this.customLayouts[layoutName] = layout;
      
      this._saveCustomLayouts();

      logger.info(`自定义布局保存成功: ${layout.label}`);
      return true;
    } catch (error) {
      logger.error(`保存布局失败:`, error);
      return false;
    }
  }

  getAvailableLayouts(): Layout[] {
    return Object.values(this.layouts);
  }

  getCurrentLayout(): string | null {
    return this.currentLayout;
  }

  async resetLayout(): Promise<boolean> {
    try {
      Object.keys(this.layouts).forEach(layoutName => {
        document.body.classList.remove(`douyin-ui-customizer-layout-${layoutName}`);
      });

      const allSelectors = new Set<string>();
      Object.values(this.layouts).forEach(layout => {
        layout.rules.forEach(rule => {
          if (rule.selector) {
            rule.selector.split(',').forEach(selector => {
              allSelectors.add(selector.trim());
            });
          }
        });
      });

      for (const selector of allSelectors) {
        await elementController.showElement(selector);
        elementController.resetElementStyle(selector);
      }

      this.currentLayout = null;
      localStorage.removeItem(`${this.layoutPrefix}current`);

      logger.info('布局已重置');
      return true;
    } catch (error) {
      logger.error('重置布局失败:', error);
      return false;
    }
  }

  deleteLayout(layoutName: string): boolean {
    try {
      if (PREDEFINED_LAYOUTS[layoutName]) {
        logger.warn(`不能删除预定义布局: ${layoutName}`);
        return false;
      }

      if (!this.customLayouts[layoutName]) {
        logger.warn(`自定义布局不存在: ${layoutName}`);
        return false;
      }

      if (this.currentLayout === layoutName) {
        this.resetLayout();
      }

      delete this.layouts[layoutName];
      delete this.customLayouts[layoutName];
      
      this._saveCustomLayouts();

      logger.info(`布局删除成功: ${layoutName}`);
      return true;
    } catch (error) {
      logger.error(`删除布局失败:`, error);
      return false;
    }
  }

  exportLayout(layoutName: string): string | null {
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

  importLayout(layoutJson: string): boolean {
    try {
      const layout = JSON.parse(layoutJson) as Layout;
      
      if (!layout.name || !layout.rules || !Array.isArray(layout.rules)) {
        throw new Error('无效的布局配置格式');
      }

      layout.isCustom = true;
      layout.importedAt = new Date().toISOString();

      this.layouts[layout.name] = layout;
      this.customLayouts[layout.name] = layout;
      
      this._saveCustomLayouts();

      logger.info(`布局导入成功: ${layout.label || layout.name}`);
      return true;
    } catch (error) {
      logger.error(`导入布局失败:`, error);
      return false;
    }
  }

  private _loadCustomLayouts(): void {
    try {
      const savedLayouts = localStorage.getItem(`${this.layoutPrefix}custom`);
      if (savedLayouts) {
        const layouts = JSON.parse(savedLayouts) as Record<string, Layout>;
        
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

  private _saveCustomLayouts(): void {
    try {
      localStorage.setItem(`${this.layoutPrefix}custom`, JSON.stringify(this.customLayouts));
    } catch (error) {
      logger.error('保存自定义布局失败:', error);
    }
  }
}

const layoutController = new LayoutController();

export { LayoutController };
export default layoutController;