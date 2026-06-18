# 抖音 UI 定制器 - 代码审查报告（安全 & 最佳实践）

> 生成日期: 2026-06-18
> 审查范围: `src/` 目录下所有 TypeScript 源码 + `build.js` 构建脚本
> 类型检查: `npx tsc --noEmit` — **通过 (exit code 0，无错误)**

---

## 1. 执行摘要

### 1.1 安全评估分级

| 级别 | 问题数量 | 说明 |
| :--- | :--- | :--- |
| 🔴 Critical（严重） | 1 | 存在远程脚本注入入口 |
| 🟠 High（高危） | 2 | XSS 风险 / 全局命名空间污染 |
| 🟡 Medium（中危） | 5 | 输入校验不足 / 存储无隔离等 |
| 🟢 Low（低危） | 3 | 调试信息暴露 / 可访问性 |
| ✅ Info（建议） | 4 | 代码结构/可维护性 |

### 1.2 项目架构要点（React 最佳实践对照）

项目 **未使用 React**，它是一个纯 TypeScript 用户脚本（Tampermonkey Userscript），直接操作 DOM。因此我们按 **前端/浏览器原生代码** 的最佳实践进行审查：

| 关注点 | 当前状态 | 结论 |
| :--- | :--- | :--- |
| 组件化/模块化 | ✅ 有 utils / ui / controllers 分离 | 结构合理 |
| 状态管理 | ❌ 以全局单例 + localStorage 为主 | 建议引入集中的 store |
| 类型安全 | ✅ TypeScript + 严格模式 `strict: true` | 已达标 |
| DOM 操作 | ❌ 大量 innerHTML/querySelectorAll | 性能与安全风险并存 |
| 事件绑定 | ❌ 未集中管理，缺少清理 | 内存泄漏风险 |
| 第三方依赖 | ⚠️ 用户可通过"自定义脚本"加载外部 URL | 需严格校验 |

---

## 2. 🔴 Critical / 🟠 High 问题

### 🔴 SEC-001 自定义脚本可能导致远程代码执行
**文件:** [src/ui/panels/settingsPanel.ts](file:///workspace/src/ui/panels/settingsPanel.ts#L310-L322)
**文件:** [src/ui_manager.ts](file:///workspace/src/ui_manager.ts#L412-L445)

**描述:**
用户可通过 `advanced.customScripts` 添加任意脚本 URL（支持 CDN / unpkg 等）或内联代码。虽然 UI 有 `confirm` 二次确认，且域名包含白名单校验：

```ts
if (!allowedDomains.some(allowedDomain => domain.includes(allowedDomain))) {
  const scriptConfirmed = confirm('...');
  if (!scriptConfirmed) return;
}
```

**问题:**
1. `domain.includes(allowedDomain)` 这种 **子串匹配** 不可靠。例如 `cdn.jsdelivr.net.evil.com` 会被误放。
2. **没有任何地方真正执行这些脚本**（代码中只是保存到 `config.advanced.customScripts`）——这是一个**未完成的功能**，如果未来真的用 `eval()` / `new Function()` / `<script src>` 去执行，将引入严重的 RCE 风险。

**建议:**
- 使用 `new URL(script).hostname === allowedDomain`（精确匹配）或者 `URL.hostname.endsWith('.' + allowedDomain)`。
- 在真正实现执行逻辑前，先实现 **CSP 校验 / 签名校验**。
- 明确标记此功能为"未启用"。

---

### 🟠 SEC-002 未转义的 `innerHTML` 与模板字符串注入风险
**文件:** [src/ui/panels/settingsPanel.ts](file:///workspace/src/ui/panels/settingsPanel.ts#L313-L318)
**文件:** [src/main.ts](file:///workspace/src/main.ts#L117-L163)

**描述:**

```ts
// settingsPanel.ts
<input type="text" value="${script}" data-index="${index}" ... />
// script 来自存储，未转义 —— 若 script 含 `"><script>alert(1)</script>` 将造成 XSS
```

```ts
// main.ts 中的悬浮按钮直接写死字符串，属于安全，但其他动态内容应警惕
floatButton.innerHTML = '⚙️';
```

**建议:**
- 对用户可控的字符串一律使用 `textContent` / `setAttribute`，避免模板字符串拼接到 HTML 中。
- 可封装一个 `escapeHtml(str)` 工具函数。

---

### 🟠 SEC-003 `window.douyinUICustomizer` 暴露到全局，可被页面脚本篡改
**文件:** [src/main.ts](file:///workspace/src/main.ts#L328)

**描述:**

```ts
window.douyinUICustomizer = douyinUICustomizer;
```

此对象暴露了 `setConfig / refresh / theme.apply` 等方法。抖音主站的脚本或第三方广告脚本都能访问并调用。

**建议:**
- 如果仅用于调试，请包裹在 `if (config.debugMode)` 内。
- 使用 `Object.freeze()` / `Object.defineProperty(..., { writable: false, configurable: false })` 防止被篡改。
- 考虑使用 **IIFE 闭包**，完全不暴露到 window。

---

## 3. 🟡 Medium 问题

### 🟡 SEC-004 localStorage 命名空间有污染风险
**文件:** [src/utils/storage.ts](file:///workspace/src/utils/storage.ts#L198-L239)
**文件:** [src/config.ts](file:///workspace/src/config.ts#L5)

**描述:**
- `NamespacedStorage` 使用 `prefix_key`，但项目中同时混用未命名空间的裸 key（`douyin_tool_debug_mode`、`lastUpdateCheckTime` 等）。
- `config.storage` 使用 `NamespacedStorage('douyin_tool_config')`，但其他地方直接调用 `localStorage.setItem('douyin_tool_xxx')`。

**建议:**
- 统一所有存储键通过一个 `storage.ts` 入口管理。
- 添加 `key` 白名单枚举，防止与其他 Userscript 冲突。

---

### 🟡 SEC-005 导入配置无 Schema 校验
**文件:** [src/config.ts](file:///workspace/src/config.ts#L339-L358)

**描述:**

```ts
export function importConfig(jsonString: string): boolean {
  const config = JSON.parse(jsonString);  // any
  ...
  currentConfig = mergeConfig(config as Partial<Config>, DEFAULT_CONFIG);
}
```

`JSON.parse` 得到 `any`。恶意用户可构造 `JSON` 包含：
- 超长字符串（DoS）
- 意外字段（原型污染 `{ "__proto__": { ... } }`）

**建议:**
- 使用 `Object.create(null)` 或结构化克隆（`structuredClone`）作为 merge 目标。
- 使用 **Zod / Valibot** 等运行时校验库做 Schema 验证。

---

### 🟡 SEC-006 `MutationObserver` 未 `disconnect` 造成内存泄漏
**文件:** [src/utils/pageObserver.ts](file:///workspace/src/utils/pageObserver.ts#L17-L63)
**文件:** [src/ui_manager.ts](file:///workspace/src/ui_manager.ts#L540-L548)

**描述:**
- `observePageChanges` 注册了一个观察 `document.documentElement` 的 MutationObserver，但**只有在 cleanup 时才 disconnect**（cleanup 未必被触发）。
- `ui_manager` 中的 `observeDomChanges` 也会新建 observer，存在"重复注册"风险。

**建议:**
- 每次调用 `observePageChanges` 前先 `stopObserving()`。
- 使用 `AbortController` + 弱引用管理观察者。

---

### 🟡 SEC-007 DOM 查询过于宽泛，可能误伤正常元素
**文件:** [src/ui/customizations/liveCustomizations.ts](file:///workspace/src/ui/customizations/liveCustomizations.ts#L56-L67)
**文件:** [src/ui/customizations/videoCustomizations.ts](file:///workspace/src/ui/customizations/videoCustomizations.ts#L85-L93)

**描述:**

```ts
const bulletElements = document.body.querySelectorAll('div');  // 扫描所有 div
const potentialBullets = Array.from(bulletElements).filter(el => { ... });
```

在大页面上这样做的代价很高（O(n) 全量扫描），并且类名匹配 `/gift|present|.../` 也有"误伤"概率——如果某个 div 的 `classList` 里刚好包含 `gift`（但它是合法元素），也会被隐藏。

**建议:**
- 将选择器收敛，如 `[data-douyin-el="gift"]` 这类显式标识；
- 在无法获取精确 selector 时，至少给元素做 **双向确认**（检查 `style.position` / `style.zIndex` 的同时也检查 `innerText.length` 或节点可见性）。

---

### 🟡 SEC-008 构建脚本直接拼接 HTML，未转义
**文件:** [build.js](file:///workspace/build.js#L104-L115)

**描述:**
`build.js` 使用简单的字符串替换 `.ts` → `.js`，然后直接拼接文件。如果源码文件中有 `</script>` 字符串，会破坏 Userscript 元数据块。

**建议:**
- 改用 esbuild 打包（`npm` 中已经声明了 `esbuild` 依赖）。
- 保留一个最小的 banner 生成函数，不直接把源文件内容 append 到 output。

---

## 4. 🟢 Low 问题

### 🟢 LOW-001 全局 `console` 没有生产环境抑制
**文件:** [src/utils/logger.ts](file:///workspace/src/utils/logger.ts)

虽然存在 logger 抽象，但默认会输出到 `console`。在生产环境下这些信息可能被主站调试脚本读取。

**建议:** 增加 `isProd` 开关，在生产时使用 `console.debug` 或完全禁用。

---

### 🟢 LOW-002 缺少键盘无障碍支持
面板按钮缺少 `aria-label` / `role` 等可访问性属性。例如设置面板中的关闭按钮只是 `×`，不便于屏幕阅读器识别。

---

### 🟢 LOW-003 缺少 `Content-Security-Policy` 限制
Userscript 环境下 CSP 由主站控制，但在 `@grant GM_xmlhttpRequest` 之外，仍可发起任意网络请求。建议在代码层面建立 URL 白名单。

---

## 5. 前端/工程化建议（借鉴 React 最佳实践）

### 5.1 组件化与声明式 UI
当前 `settingsPanel.ts` 与 `settingsEvents.ts` 通过模板字符串拼接 HTML 再手动绑定事件。建议改造成：

```ts
// 伪代码
export function createSettingsPanel(config: Config): HTMLElement {
  const root = document.createElement('div');
  root.className = 'douyin-ui-customizer-panel';
  // 用 createElement + textContent 构建，而非 innerHTML
  return root;
}
```

### 5.2 事件管理
可引入一个轻量的 `EventBus`（目前已有 `eventEmitter.ts`），并统一：
- 所有事件订阅返回 `unsubscribe` 函数；
- 在组件 `cleanup` 时集中调用。

### 5.3 状态管理
推荐引入一个轻量的 `Store<Config>`：
```ts
// src/store.ts
class ConfigStore {
  private listeners = new Set<(c: Config) => void>();
  subscribe(fn: (c: Config) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  update(partial: Partial<Config>) { ... }
}
```

### 5.4 类型安全
- 将 `// @ts-ignore` / `as any` 替换为类型守卫（已在部分文件实现）。
- `Config` 接口中的 `[key: string]: unknown` 应尽量收缩为显式字段，避免过度宽泛。

### 5.5 可测试性
建议把 DOM 操作 / 业务逻辑 / 纯函数分层：
- 纯函数（如 `isLivePage(pathname)`） → 单元测试；
- DOM 工具函数 → jsdom 测试；
- Userscript 主循环 → 依赖注入 + 轻量端到端测试。

---

## 6. 修复路线图（优先级）

| 顺序 | 问题 | 修复要点 | 影响文件 |
| :--- | :--- | :--- | :--- |
| P0 | SEC-001 | 删除自定义脚本功能的半实现，或提供签名校验 | `src/ui_manager.ts`, `src/ui/panels/settingsPanel.ts` |
| P1 | SEC-002 | 用 `textContent`/`setAttribute` 替代模板字符串 HTML 拼接 | `src/ui/panels/settingsPanel.ts`, `src/ui/panels/settingsEvents.ts` |
| P1 | SEC-003 | 移除或冻结 `window.douyinUICustomizer` | `src/main.ts` |
| P2 | SEC-004 | 统一 storage key 管理 | `src/utils/storage.ts`, `src/config.ts` |
| P2 | SEC-005 | 增加 JSON Schema / Zod 校验 | `src/config.ts` |
| P2 | SEC-006 | 清理重复的 MutationObserver | `src/utils/pageObserver.ts`, `src/ui_manager.ts` |
| P3 | SEC-007/008 | 优化 DOM selector + 改用 esbuild 打包 | `src/ui/customizations/*.ts`, `build.js` |
| P4 | LOW-001/002/003 | 日志控制 / 无障碍 / CSP 白名单 | `src/utils/logger.ts`, 各 UI 文件 |

---

## 7. 总结与结论

1. **类型系统整体健康**：`tsc --noEmit` 零错误，`strict: true` 已开启，基础的类型安全有保障。
2. **主要风险在"安全与可扩展性"**：项目在 UI 注入、自定义脚本、全局变量暴露等方面存在实际的攻击面。
3. **性能存在隐患**：`document.body.querySelectorAll('div')` 与正则遍历 className 在 SPA 重渲染场景下可能成为瓶颈。
4. **代码组织合理**：`utils / ui / controllers` 的分层方式是可取的，后续只需加强：
   - 事件清理（生命周期管理）
   - 状态集中管理（Store）
   - 声明式 UI（避免 innerHTML）
   - storage key 的统一与校验

**总体评价**：在正式发布前，应至少完成 P0 和 P1 的修复工作。

---

> 报告生成：`npx tsc --noEmit` exit 0，无类型错误。
