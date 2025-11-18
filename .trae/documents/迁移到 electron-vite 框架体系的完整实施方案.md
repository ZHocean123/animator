## 目标
- 将当前所有 Electron 相关代码与构建流程迁移到 electron-vite，统一主进程、预加载与渲染进程的构建与开发体验。
- 保留全部既有功能（IPC、原生模块、热更新、打包发布），并补齐测试与性能验证。

## 现状与依赖清点
- 主进程入口与调度：
  - `d:\codespace\animator\index.mjs:27-35` 动态加载 `haiku-creator/lib/electron` 或烘焙模块并管理子进程 `HaikuHelper`。
- Creator 主进程：
  - `d:\codespace\animator\packages\haiku-creator\src\electron.mjs:7-15` 直接导入 `electron`，创建与管理窗口、协议、IPC 等。
  - `d:\codespace\animator\packages\haiku-creator\src\bakery\electron.ts:1-20` 使用 `BrowserWindow` 与 `ipcMain` 管理“烘焙”窗口与消息。
- 渲染入口与 IPC：
  - `d:\codespace\animator\packages\haiku-creator\src\entry.js:1-6` 在渲染层直接使用 `electron.ipcRenderer`，并初始化上报与界面。
- Electron 启动与打包：
  - 开发：`d:\codespace\animator\start-electron.js:4-10` 以本地电子可执行启动。
  - 打包：`d:\codespace\animator\scripts\distro-build.js:28-43` 使用 `electron-builder` 进行 Mac/Win/Linux 构建。
- 依赖：
  - 根 `package.json` 声明 `electron`、`electron-builder`、`@electron/remote` 等（`d:\codespace\animator\package.json:82-104,100-104`）。
  - 未发现现存的 webpack/rollup/vite 配置文件。

## 迁移原则
- 以最小侵入方式将现有主进程与渲染代码接入 electron-vite 的三段配置（main/preload/renderer）。
- 保留 `@electron/remote` 现有用法，主进程补充初始化，后续逐步引导到 `preload + contextBridge` 的安全模型。
- 打包仍由 `electron-builder` 负责，bundling 交由 electron-vite，发布流程保持不变但指向 `out` 产物目录。

## 目录重构与配置文件
- 在仓库根新增 electron-vite 配置文件：`electron.vite.config.ts`
  - main：入口设为根主进程 `index.mjs`，以适配当前调度逻辑。
  - preload：新增 `src/preload/index.ts`（可先为空或仅桥接必要 API）。
  - renderer：采用多页面结构 `src/renderer`，分别承载 Creator/Timeline/Glass 三个窗口的入口 HTML；Vite `rollupOptions.input` 显式配置多入口。
- 推荐目录结构（根级）：
  - `src/main/index.ts`（后续阶段将根 `index.mjs` 迁移为 TS；首阶段直接以 `index.mjs` 为 main 入口）
  - `src/preload/index.ts`
  - `src/renderer/creator/index.html` 与 TS/JS 入口（指向 `packages/haiku-creator/src/entry.js`）
  - `src/renderer/timeline/index.html`
  - `src/renderer/glass/index.html`

## 配置要点（electron-vite）
- `main.build.lib.entry` 指向 `./index.mjs`（或后续迁到 `src/main/index.ts`）。
- 默认对 main/preload 外置 `electron` 与 Node 内置模块，无需额外 external；renderer 按需在 `rollupOptions.external` 标注原生模块（如 `sqlite3`、`serialport` 等，如后续检出）。
- dev：使用 `electron-vite dev`，主进程热重载、渲染 HMR；生产：`electron-vite build` 输出到 `out/main|preload|renderer`。
- 生产入口：根 `package.json.main` 需改为 `./out/main/index.js`（官方要求）。

## 主进程调整
- 根 `index.mjs`（`d:\codespace\animator\index.mjs`）作为 main 构建入口，保留子进程与协议处理：
  - 加入 `@electron/remote/main` 初始化（仅用于兼容现有渲染层 remote 用法）。
  - 在创建 `BrowserWindow` 时，dev 模式加载 `MAIN_WINDOW_VITE_DEV_SERVER_URL`，生产加载 `out/renderer/.../index.html`。
- Creator 专属主进程：`packages/haiku-creator/src/electron.mjs` 的窗口与 IPC 逻辑迁移为 main 内的窗口管理模块，或在阶段一保持其动态导入但通过 electron-vite 编译产物加载。

## 渲染层调整
- 为 Creator/Timeline/Glass 各自新增 `index.html`，入口脚本沿用现有 `packages/*/src/entry.js` 或 `index.jsx`。
- dev 模式通过 Vite HMR 工作；生产模式打进 `out/renderer`，主进程 `loadFile` 对应不同窗口的 HTML。

## preload 规划
- 阶段一：可最小桥接（如暴露 `ipcRenderer` 的 send/on 包装），保留 `@electron/remote` 用法以保证功能不变。
- 阶段二：逐步将渲染层直接 `import 'electron'` 与 `@electron/remote` 替换为 `contextBridge` 安全桥接，提升隔离与安全性。

## package.json 更新方案
- 新增：`electron-vite`、`vite`（devDependencies），并新增脚本：
  - `dev: "electron-vite dev"`
  - `prebuild: "electron-vite build"`
  - `start: "electron-vite preview"`
- 更新：将 `main` 指向 `./out/main/index.js`，并在 `build.directories.app` 指向 `out`。
- 清理：保留 `electron-builder`（用于打包），移除未使用的前端打包链（如 `webpack`，经检索无配置文件，可在后续删除依赖）。
- 调整 `scripts/distro-build.js`：先运行 `electron-vite build`，再调用现有 `electron-builder` 打包，保留证书签名等逻辑。

## 保留功能保证
- IPC：保持主进程 `ipcMain` 与渲染层 `ipcRenderer` 现有通道名不变（参考 `packages\haiku-creator\src\electron.mjs:149-157,160-168` 与 `packages\haiku-creator\src\entry.js:6-31`）。
- 原生模块：在 Vite 构建中标记为 external，避免被错误打包；保留 `extraResources` 的 ffmpeg 等资源（`d:\codespace\animator\package.json:184-195`）。
- 开发热更新：使用 `electron-vite dev`，主进程热重载、渲染 HMR。
- 生产打包：沿用 `electron-builder`，应用工作目录改为 `out`，源代码可从安装包中剔除（符合官方建议）。

## 测试与验证方案
- 单元测试（Vitest + TS）：
  - IPC 通道：mock `ipcMain/ipcRenderer` 验证消息路由与 payload。
  - 主进程模块：对窗口管理与 URL 处理逻辑做函数级测试（参考 `index.mjs:51-58` 与 Creator handleUrl `packages\haiku-creator\src\electron.mjs:119-133`）。
- 端到端测试（Playwright + Electron）：
  - 启动 dev，验证三个窗口的加载、菜单、IPC 往返；截图校验关键 UI。
- 性能基准：
  - 构建耗时：对比 `electron-builder` 旧链（仅 bundle）与 `electron-vite build`。
  - 启动耗时：在主进程 `app.whenReady` 到 `did-finish-load` 埋点，比较迁移前后。

## 风险与兼容性
- 渲染层直接使用 `electron` 与 `@electron/remote` 存在安全风险；阶段一保留以保证功能，阶段二切换到 `contextIsolation + preload`。
- 多页面渲染入口需要梳理 HTML 与脚本关系，确保现有资源路径与静态依赖正确；必要时在 `public` 或 `resources` 中复制资源。
- `electron-updater`（`packages\haiku-creator\src\electron.mjs:32-33`）需在新入口中维持初始化；结合打包渠道确认更新源。

## 里程碑与实施步骤
1) 引入 electron-vite 与基础配置文件，脚本改造，保证能 dev 启动一个窗口（Creator）。
2) 接入多页面渲染入口，打通 Timeline 与 Glass。
3) 生产构建：`electron.vite build` 输出 `out/*`，`electron-builder` 打包，验证安装包运行。
4) 测试落地：单测/E2E/性能基准覆盖核心路径。
5) 安全加固：逐步迁移到 `preload + contextBridge`，减少 remote 与直接导入 electron。

## 需要你的确认
- 是否采用“保留 electron-builder 作为发布工具，bundling 切到 electron-vite”的策略；若需彻底替换为 forge 等其他方案，可在此阶段另行评估。
- 多窗口的渲染入口采用多页面（推荐）还是合并为单页面内路由（改动更大）。
