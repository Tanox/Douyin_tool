export interface ControlBarConfig {
  show: boolean;
  autoHide: boolean;
  position: 'top' | 'bottom';
  size: 'small' | 'medium' | 'large';
  opacity: number;
}

export interface PlaybackConfig {
  defaultQuality: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  autoPlay: boolean;
  loop: boolean;
}

export interface VideoUIConfig {
  showLikeButton: boolean;
  showCommentButton: boolean;
  showShareButton: boolean;
  showAuthorInfo: boolean;
  showMusicInfo: boolean;
  showDescription: boolean;
  showRecommendations: boolean;
  layout: 'default' | 'compact' | 'fullscreen';
  controlBar: ControlBarConfig;
  playback: PlaybackConfig;
}

export interface DanmakuConfig {
  fontSize: number;
  color: string;
  opacity: number;
  speed: 'fast' | 'medium' | 'slow';
  position: 'top' | 'middle' | 'bottom';
  maxLines: number;
}

export interface LiveUIConfig {
  showGifts: boolean;
  showDanmaku: boolean;
  showRecommendations: boolean;
  showAds: boolean;
  showStats: boolean;
  danmaku: DanmakuConfig;
  layout: 'default' | 'minimal' | 'immersive';
  volume: number;
}

export interface GeneralConfig {
  autoPlay: boolean;
  autoScroll: boolean;
  keyboardShortcuts: boolean;
  notifications: boolean;
  language: string;
  animations: boolean;
  updateCheck: boolean;
}

export interface AdvancedConfig {
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  customScripts: string[];
}

export interface AppConfig {
  version: string;
  theme: 'light' | 'dark';
  videoUI: VideoUIConfig;
  liveUI: LiveUIConfig;
  general: GeneralConfig;
  advanced: AdvancedConfig;
}

export interface ElementStructure {
  tagName?: string;
  attributes?: Record<string, string>;
  children?: ElementStructure[];
  text?: string;
}

export interface CreateElementOptions {
  [key: string]: any;
  style?: Record<string, string>;
  className?: string;
}

export interface LoggerOptions {
  prefix?: string;
  enableDebug?: boolean;
  enableInfo?: boolean;
  enableWarn?: boolean;
  enableError?: boolean;
  maxHistorySize?: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface StorageInfo {
  totalItems: number;
  totalSize: number;
  totalSizeKB: string;
  items: Record<string, number>;
}

export interface DOMCacheEntry {
  element: Element | null;
  timestamp: number;
}

export type DOMQuery = string | ((element: Element) => boolean);

export interface BatchUpdateCallback {
  (fragment: DocumentFragment): void;
}