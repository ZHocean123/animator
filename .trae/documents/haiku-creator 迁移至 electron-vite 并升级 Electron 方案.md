## 总览
- 目标：将 `d:/codespace/animator/packages/haiku-creator` 迁移到符合 electron-vite 的工程结构，升级 Electron 至 30+，在尽量不动核心业务的前提下完成兼容性改造、测试与验证。
- 策略：先完成主进程与工程结构迁移（保守：保留渲染进程现状与 NodeIntegration），再分阶段推进安全收口（预加载隔离、API抽象）。

## 项目现状
- 当前 Electron 版本：`devDependencies.electron = 2.0.8`（非常老旧）。
- 渲染层大量直接使用 `electron` 模块（`remote/shell/ipcRenderer/clipboard/webFrame`），例如：`src/react/Creator.js`，`src/entry.js`。
- 主进程入口逻辑在 `src/electron.js`，使用了已废弃 API：`app.makeSingleInstance`、同步 `dialog.showOpenDialog`、部分回调式 API（`session.resolveProxy`）。
- 现行构建：`tsc` 输出至 `lib/`，`index.html` 通过 `require('./lib/entry')` 启动渲染层。

## 迁移总体策略
- 第一阶段（结构与主进程）：
  - 引入 electron-vite 基础结构，迁移主进程入口到 `electron/main/index.ts`。
  - 新增 `electron/preload/index.ts`，先提供轻量桥接（可逐步替代 `remote`）。
  - 渲染进程保留旧 HTML + 旧代码路径，设置 `nodeIntegration: true` 与 `contextIsolation: false`，最大限度降低改动面。
- 第二阶段（安全与现代化）：
  - 分批替换渲染层对 `remote`、`shell`、`clipboard`、`webFrame` 的直接访问为预加载暴露的安全 API。
  - 将 `nodeIntegration` 逐步关闭、`contextIsolation` 打开，完成隔离。

## 目录重构（electron-vite 结构）
- 新增：
  - `electron/main/index.ts`（主进程入口）
  - `electron/preload/index.ts`（预加载脚本）
  - `electron.vite.config.mjs`（ESM 配置；不改项目 `type` 时用 `.mjs` 扩展）
- 渲染层：沿用现有根目录 `index.html`（参考官方「自定义结构」方案），在配置中设定 `renderer.root = '.'` 与 `rollupOptions.input.index = resolve(__dirname, 'index.html')`。
- 参考文档要点：支持自定义布局并指向根 HTML（见官方文档片段）。

## 主进程迁移要点（index.ts）
- 改造与替换：
  - `app.makeSingleInstance` → `app.requestSingleInstanceLock` + 监听 `second-instance`。
  - 同步 `dialog.showOpenDialog` → `dialog.showOpenDialogSync`；`showMessageBox` → `showMessageBoxSync`（保留现有交互逻辑）。
  - `session.resolveProxy(url, cb)` → `await session.resolveProxy(url)`（Promise 化）。
  - 保留 `protocol.registerFileProtocol('web+haikuroot', ...)`，在 `app.whenReady()` 后注册；如需要加载资源特权，可补充 `protocol.registerSchemesAsPrivileged`。
  - `autoUpdater`（Windows）从自定义 `setFeedURL + checkForUpdates` 迁移到 `electron-updater` 最新 API（优先 `checkForUpdatesAndNotify()`），保留自定义源时使用支持的新配置方式。
- 加载渲染层：
  - 开发态：加载 `renderer` devServer URL（electron-vite环境变量自动注入）。
  - 生产态：`loadFile('dist/renderer/index.html')` 或按配置输出路径加载；若保留旧 `index.html`，按 electron-vite 构建产物定位。
- `BrowserWindow` 初始策略：第一阶段启用 `webPreferences.nodeIntegration = true` 与 `contextIsolation = false`，避免大范围重写；第二阶段逐步切换到安全默认（`nodeIntegration=false`、`contextIsolation=true`、`sandbox=true`）。

## 预加载脚本（preload/index.ts）
- 暴露安全 API（contextBridge）：
  - `ipc`：封装白名单频道的 `invoke/on/send`。
  - `windowControls`：`openDevTools`、`closeDevTools`、`restart`（替代 `remote.getCurrentWindow` 操作）。
  - `system`：`clipboardWriteText`、有限的 `shellOpenExternal`。
  - `webFrame`：必要的缩放限制包装（若仍需）。
- 第二阶段逐步将渲染层对 `electron` 的直接引用替换为 `window.electronAPI.*`。

## 渲染进程兼容策略
- 第一阶段：保持现状（`require('./lib/entry')` 与直连 `electron` 模块），降低迁移风险。
- 第二阶段：
  - 将入口改为 ESM/Vite 管理（例如 `src/renderer/main.ts`），在 `index.html` 以 `<script type="module" src="/src/renderer/main.ts"></script>` 引入。
  - 将 `remote/shell/ipcRenderer/clipboard/webFrame` 调用替换为 `preload` 暴露的 API。

## electron.vite 配置（electron.vite.config.mjs）
- 采用官方自定义结构范例：
```
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main/index.ts') }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'index.html') }
      }
    }
  }
})
```
- 说明：保持根 `index.html`，后续按第二阶段切换到标准 `src/renderer` 结构。

## Electron 版本升级与破坏性变更
- 升级到 `^30.0.0`：
  - `remote` 模块移除（需预加载替代）。
  - 默认安全配置变更（`nodeIntegration=false`、`contextIsolation=true`）。
  - 多处 API Promise 化（如 `session.resolveProxy`）。
  - 单实例控制 API 变更（`requestSingleInstanceLock`）。
  - `dialog` 同步/异步签名差异（迁移到 `*Sync` 或 Promise）。
- 逐项更新主进程代码，标注变更点与风险；渲染层在第一阶段保持兼容设置。

## 依赖与脚本更新（pnpm）
- 依赖：
  - `electron` → `^30.x`（devDependencies）
  - `electron-vite` → 最新稳定版
  - `electron-updater` → 最新稳定版（若继续使用）
  - 评估 `electron-proxy-agent` 兼容版本
- 脚本（`package.json`）：
  - `dev`: `electron-vite dev`
  - `build`: `electron-vite build`
  - `preview`: `electron-vite preview`
  - `start`（旧）替换为 `pnpm dev`
  - 测试沿用 `tape + ts-node`，将 `yarn` 前缀替换为 `pnpm`。

## 配置文件更新
- `electron.vite.config.mjs` 使用 ESM；项目无需强制 `"type": "module"`。
- 保留 `tsconfig.json`（`module=commonjs`）以降低渲染层改动；后续 ESM 化在第二阶段进行。
- 若需要：在主进程入口添加协议特权注册以确保资源加载。

## 问题处理与修复
- 针对升级后不兼容点逐一修复：
  - 主进程 API 替换与 Promise 化。
  - Windows 自动更新逻辑迁移到新 `electron-updater` API 或保留自定义源的配置方案。
  - 代理解析改为 `await session.resolveProxy(url)` 并保持现有逻辑（`ElectronProxyAgent`）。
- 运行时错误排查：
  - 开发态以 `electron-vite dev` 运行，观察控制台与日志（沿用现有 `LoggerInstance`）。

## 测试与验证
- 单元测试：
  - 维持 `tape` 现有用例；如 `autoUpdate.test.js` 涉及 API 变更，更新断言与模拟。
- 端到端（可选）：增加基础窗口创建与 IPC 交互的用例（Playwright + Electron）。
- 覆盖率：继续使用 `nyc`，生成测试报告。
- 性能与稳定性：
  - 验证主窗口启动时间与内存占用；记录指标。
  - 检查代理场景与自定义协议资源加载。

## 安全与日志
- 第一阶段启用兼容设置但保留风险提示（`nodeIntegration=true`）。
- 第二阶段：切换到 `contextIsolation=true`、移除直接 `electron` 引用、经预加载白名单透出有限 API。
- 日志：沿用 `haiku-serialization/src/utils/LoggerInstance`，对关键迁移点添加分级日志。

## 交付物
- 符合 electron-vite 的项目结构与配置文件：`electron/main/index.ts`、`electron/preload/index.ts`、`electron.vite.config.mjs`。
- 升级后的 Electron 版本与主进程兼容性改造。
- 完整测试报告（`nyc` 覆盖、关键用例通过）。
- 更新项目文档（迁移说明、启动与构建脚本、风险与后续计划）。

## 后续迭代计划（第二阶段）
- 替换渲染层对 `electron` 的直接调用为 `preload` API。
- 切换到标准 `src/renderer` + Vite 入口，关闭 `nodeIntegration`、开启 `contextIsolation`。
- 逐步移除 `remote` 使用点（如 `dialog/save/openDevTools` 等），统一通过 IPC 与预加载封装。
