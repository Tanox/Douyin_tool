# 测试计划

## 测试目录结构

```
test/
├── utils/            # 工具函数测试
│   ├── dom.test.js
│   ├── logger.test.js
│   ├── storage.test.js
│   ├── eventEmitter.test.js
│   └── autoExecutor.test.js
├── controllers/      # 控制器测试
│   ├── elementController.test.js
│   └── layoutController.test.js
├── styles/           # 样式测试
│   └── theme.test.js
├── config.test.js    # 配置测试
└── ui_manager.test.js # UI管理器测试
```

## 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|------------|
| utils/ | 90%+ |
| controllers/ | 80%+ |
| styles/ | 70%+ |
| config.js | 95%+ |
| ui_manager.js | 75%+ |

## 测试策略

1. **工具函数测试**：
   - 测试防抖和节流函数的正确性
   - 测试DOM操作函数的安全性和正确性
   - 测试存储函数的CRUD操作

2. **控制器测试**：
   - 测试元素控制器的元素查找和操作
   - 测试布局控制器的布局应用

3. **配置测试**：
   - 测试配置加载、保存和验证
   - 测试配置迁移功能

4. **UI管理器测试**：
   - 测试设置面板创建和事件处理
   - 测试定制应用逻辑

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- test/utils/dom.test.js

# 查看覆盖率报告
npm test -- --coverage
```

## 覆盖率报告

测试运行后，覆盖率报告将生成在 `coverage/` 目录中。