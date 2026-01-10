# 多平台支持指南

本项目支持同时打包为 **Web 应用** 和 **Chrome 扩展**。

## 构建命令

| 命令 | 说明 | 输出目录 |
|------|------|----------|
| `pnpm build:web` | 构建 Web 版本 | `dist-web/` |
| `pnpm build:extension` | 构建 Chrome 扩展版本 | `dist-extension/` |
| `pnpm build:all` | 同时构建两个版本 | `dist-web/` 和 `dist-extension/` |
| `pnpm build` | 默认构建（扩展版本） | `dist/` |

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 默认开发模式（扩展） |
| `pnpm dev:web` | Web 版本开发模式 |
| `pnpm dev:extension` | Chrome 扩展开发模式 |

## 平台检测

在代码中使用平台检测来实现条件逻辑：

```typescript
import { platform, storage } from '@/services/platform'

// 检测当前平台
if (platform.isChromeExtension) {
  // Chrome 扩展特定代码
  console.log('Running as Chrome Extension')
} else {
  // Web 版本特定代码
  console.log('Running as Web App')
}

// 使用统一的存储接口（自动选择正确的实现）
await storage.set('key', { data: 'value' })
const data = await storage.get('key')
```

## 存储服务

项目提供了统一的存储抽象层：

- **Chrome 扩展**: 使用 `chrome.storage.local`
- **Web 版本**: 使用 `localStorage`（降级到内存存储）

```typescript
import { storage } from '@/services/platform'

// 统一的 API，自动适配不同平台
await storage.set('myKey', { foo: 'bar' })
const value = await storage.get<{ foo: string }>('myKey')
await storage.remove('myKey')
await storage.clear()
```

## 编译时常量

在 Vite 配置中定义的编译时常量：

| 常量 | Web 值 | Chrome 扩展值 |
|------|--------|---------------|
| `__PLATFORM__` | `'web'` | `'chrome-extension'` |
| `__IS_CHROME_EXTENSION__` | `false` | `true` |

使用示例：

```typescript
// 类型声明已在 src/env.d.ts 中定义
declare const __IS_CHROME_EXTENSION__: boolean

if (__IS_CHROME_EXTENSION__) {
  // 这段代码在 Web 构建时会被 tree-shaken
}
```

## 目录结构

```
├── public/              # Chrome 扩展的静态资源（包含 manifest.json）
├── public-web/          # Web 版本的静态资源
├── dist/                # 默认构建输出
├── dist-web/            # Web 版本构建输出
├── dist-extension/      # Chrome 扩展构建输出
├── vite.config.ts       # 默认配置（Chrome 扩展）
├── vite.config.web.ts   # Web 版本配置
└── vite.config.extension.ts  # Chrome 扩展配置
```

## 添加平台特定代码

### 方式 1: 编译时条件

```typescript
if (__IS_CHROME_EXTENSION__) {
  // 扩展特定代码 - Web 构建时会被移除
  chrome.runtime.sendMessage({ type: 'hello' })
}
```

### 方式 2: 运行时检测

```typescript
import { platform } from '@/services/platform'

if (platform.isChromeExtension) {
  // 运行时检测，两个版本都会包含此代码
}
```

### 方式 3: 动态导入

```typescript
if (__IS_CHROME_EXTENSION__) {
  const { chromeSpecificModule } = await import('./chromeSpecificModule')
}
```

## 迁移现有代码

如果你的代码直接使用了 `chrome.storage.local`，需要迁移到统一存储接口：

**之前:**
```typescript
const result = await chrome.storage.local.get('key')
```

**之后:**
```typescript
import { storage } from '@/services/platform'
const result = await storage.get('key')
```

## 注意事项

1. **Background Script**: 只在 Chrome 扩展版本中构建
2. **Options Page**: 只在 Chrome 扩展版本中需要
3. **Manifest.json**: 只需要放在 `public/` 目录（扩展版本使用）
4. **文件名哈希**: Web 版本使用哈希以支持缓存，扩展版本使用固定名称
