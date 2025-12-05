# Electron框架升级计划

## 当前状态分析
- 当前项目使用Electron版本：28.3.3（在pnpm-workspace.yaml中定义）
- 最新稳定版本：39.2.5（发布于2025年12月3日）
- 需要升级跨越11个主要版本（28→39）

## 升级步骤

### 1. 更新Electron版本
- 修改`pnpm-workspace.yaml`中的Electron版本从`^28.3.3`到`^39.2.5`
- 更新`package.json`中的`electronVersion`从`28.3.3`到`39.2.5`

### 2. 更新依赖项
- 运行`pnpm install`更新Electron及相关依赖
- 检查并更新与Electron相关的其他依赖项（如electron-updater等）

### 3. 处理API变更
根据Electron 28到39的变更日志，主要需要关注：
- 检查`systemPreferences`API的使用（在electron.js中）
- 验证`protocol`和`session`API的使用
- 确认`ipcMain`和`BrowserWindow`API的兼容性
- 检查`app.setAsDefaultProtocolClient`的使用

### 4. 安全性更新
- 检查并更新`contextIsolation`和`nodeIntegration`设置
- 验证所有webContents的加载策略
- 确保所有外部链接使用正确的安全策略

### 5. 测试与验证
- 运行项目的完整测试套件
- 手动测试核心功能：
  - 应用启动和关闭
  - 文件导入/导出
  - 预览功能
  - 菜单和快捷键
  - 自动更新功能

### 6. 构建验证
- 运行`pnpm build-all`确保所有包正确构建
- 测试各平台的构建过程（Windows、macOS、Linux）
- 验证electron-builder配置与新版本兼容

### 7. 文档更新
- 更新README中的Electron版本信息
- 更新CHANGELOG记录此次升级
- 更新任何开发文档中的版本引用

## 风险评估
- **高风险**：跨越11个主要版本可能包含破坏性变更
- **中风险**：某些依赖项可能不兼容新版本Electron
- **低风险**：项目代码中使用的API相对稳定

## 回滚计划
如果升级后出现严重问题：
1. 恢复`pnpm-workspace.yaml`和`package.json`中的版本号
2. 运行`pnpm install`恢复旧版本
3. 重新构建和测试

## 预计时间
- 版本更新和依赖安装：30分钟
- API兼容性检查和修复：2-4小时
- 测试和验证：1-2小时
- 构建验证：30分钟
- 文档更新：30分钟

总计：4-8小时（取决于发现的兼容性问题数量）