# Haiku Animator - 项目详细描述文档

## 项目概述

**Haiku Animator** 是一个用于创建 Lottie 动画和交互式 Web 组件的专业设计工具。该项目采用开源 AGPL 许可证，主要面向企业动效设计团队、数字创意工作室和动画教学场景。

- **项目名称**: Haiku Animator
- **当前版本**: 5.1.2
- **许可证**: AGPL（用户创建的项目可自由许可和发布）
- **组织**: Haiku Systems Inc.
- **仓库类型**: Monorepo（使用 pnpm workspaces）

## 核心特性

### 1. 可视化编辑能力
- **自由变换画布**: 支持矢量图形的可视化编辑
- **可视化时间轴**: 关键帧动画编辑器
- **资源链接**: 支持从 Figma、Illustrator 或 Sketch 导入设计资源

### 2. 导出能力
- 导出为 Lottie 动画格式
- 导出为 GIF 动画
- 导出为视频文件

### 3. 高级功能
- **表达式系统**: 类似电子表格的属性"表达式"，用于创建交互和动画
- **代码编辑器**: 支持编辑交互式元素动作和原始项目源代码
- **Monaco 编辑器集成**: 提供强大的代码编辑体验

## 技术架构

### 项目结构

这是一个基于 **pnpm workspaces** 的 monorepo 项目，包含以下主要模块：

```
animator/
├── packages/
│   ├── @haiku/           # 核心 Haiku 包命名空间
│   │   ├── cli/          # 命令行工具
│   │   ├── core/         # 核心运行时引擎
│   │   ├── sdk-client/   # SDK 客户端
│   │   └── sdk-inkstone/ # SDK Inkstone 工具
│   ├── haiku-common/         # 公共库
│   ├── haiku-creator/        # Creator UI（主编辑器界面）
│   ├── haiku-glass/          # Glass UI 组件
│   ├── haiku-plumbing/       # 序列化器和进程管理
│   ├── haiku-serialization/  # 序列化工具
│   ├── haiku-timeline/       # 时间轴组件
│   ├── haiku-formats/        # 格式处理
│   ├── haiku-sdk-creator/    # SDK Creator 工具
│   ├── haiku-ui-common/      # 通用 UI 组件
│   ├── haiku-fs-extra/       # 文件系统扩展
│   ├── haiku-admin-cli/      # 管理命令行工具
│   ├── haiku-testing/        # 测试工具
│   └── haiku-vendor-legacy/  # 遗留供应商代码
├── scripts/          # 构建和开发脚本
├── build/            # 构建配置
├── src/              # 主应用源代码
├── out/              # 编译输出
└── app/              # 应用配置
```

### 核心包说明

#### 1. **@haiku/core**
- **职责**: Haiku 动画运行时核心引擎
- **类型**: workspace 包
- **用途**: 提供动画播放、渲染和核心 API

#### 2. **haiku-creator**
- **职责**: 主编辑器 UI 界面
- **版本**: 5.1.2
- **技术栈**:
  - React 18.3.0
  - Electron 集成
  - Monaco Editor（代码编辑）
  - Radium（样式管理）
- **主要依赖**:
  - haiku-glass（UI 组件）
  - haiku-timeline（时间轴）
  - haiku-serialization（序列化）
  - haiku-ui-common（通用 UI）

#### 3. **haiku-glass**
- **职责**: 提供可复用的 UI 组件库
- **技术栈**:
  - React 18.3.0
  - Radium 样式系统
  - Color 操作库

#### 4. **haiku-plumbing**
- **职责**: 序列化器、进程管理和底层服务
- **功能**:
  - Git 集成（isomorphic-git）
  - 文件监控（chokidar）
  - 代码打包（rollup）
  - WebSocket 通信

#### 5. **haiku-serialization**
- **职责**: 动画序列化和反序列化
- **技术栈**:
  - Babel 7.0.0（代码解析和生成）
  - SVGO（SVG 优化）
  - Prettier（代码格式化）
- **功能**:
  - AST 操作和转换
  - 图像处理
  - 多种格式支持

#### 6. **haiku-timeline**
- **职责**: 时间轴编辑器组件
- **用途**: 提供关键帧动画编辑界面

#### 7. **haiku-common**
- **职责**: 公共库和工具函数
- **类型**: 通用工具包
- **用途**: 为其他包提供共享功能

### 技术栈

#### 前端技术
- **UI 框架**: React 18.3.0
- **样式方案**: Radium 0.18.1
- **状态管理**: React Transition Group
- **编辑器**: Monaco Editor 0.15.6

#### 桌面应用
- **框架**: Electron 35.7.5（主应用）/ 33.2.1（某些包）
- **构建工具**: electron-builder 24.13.3
- **打包方式**: electron-vite 4.0.1

#### 编译和构建
- **TypeScript**: 5.6.0
- **编译器**: tsdown 0.16.5（替代 tsc，提供更快的编译速度）
- **打包工具**: 
  - Rollup 0.53.3
  - Webpack 5.95.0
  - Vite 7.2.2

#### 工具库
- **工具函数**: lodash-es 4.17.21（已从 lodash 迁移，支持更好的 tree-shaking）
- **日期处理**: moment 2.18.1 / 2.29.4
- **代码解析**: @babel/parser 7.28.5
- **AST 操作**: @babel/traverse, @babel/generator
- **文件系统**: fs-extra 11.2.0

#### 测试框架
- **测试运行器**: tape 4.9.0
- **测试报告**: tap-spec 4.1.2, nyc 13.0.1
- **代码检查**: tslint 5.11.0, eslint 9.39.1

#### 版本管理和包管理
- **包管理器**: pnpm 8.0.0+
- **Node.js 版本**: 22.0.0+（新版本）/ 8.15.1（开发环境）
- **工作区**: pnpm workspaces

## 开发工作流

### 1. 环境要求

#### macOS 开发环境
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.6/install.sh | bash

# 安装 Node.js 8.15.1
nvm install 8.15.1 && nvm alias default 8.15.1 && nvm use 8.15.1

# 安装 pnpm
npm install -g pnpm@8.0.0

# Python 2.7.16（推荐使用 pyenv）
```

#### Windows 开发环境
```powershell
# 安装 Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装依赖
choco install git python2 -y
choco install nodejs-lts -y --version 8.15.1
choco install pnpm -y --version 8.0.0 --ignore-dependencies

refreshenv
```

> **注意**: Windows 环境下运行开发版本时无法登录 Figma，需设置环境变量 `FIGMA_TOKEN`

### 2. 初始化项目

```bash
# 安装依赖
pnpm install && pnpm setup

# 启动开发服务器（交互式）
pnpm start

# 启动开发服务器（使用默认配置）
pnpm go
```

### 3. 开发命令

#### 监听文件变化
```bash
# 使用 tsdown 监听所有包的变化
pnpm watch-all
```

> **重要更新**: 项目已从 `tsc` 迁移到 `tsdown`，提供更快的 TypeScript 编译速度

#### 代码质量检查
```bash
# 检查所有代码
pnpm lint-all

# 运行所有测试
pnpm test-all

# 编译所有包
pnpm compile-all
```

### 4. 调试

项目提供了 VS Code 调试配置：

1. 安装 **Debugger for Chrome** VS Code 扩展
2. 启动应用：`pnpm start`
3. 在 VS Code 调试菜单中选择：
   - `attach-glass` - Glass UI 调试
   - `attach-timeline` - Timeline 调试
   - `attach-creator` - Creator 调试

**调试端口**:
- Plumbing: 9221
- Electron 渲染进程: 9222

### 5. 性能分析

使用内置的 logger 进行性能分析：

```javascript
logger.time('操作名称')
// 需要分析的代码
logger.timeEnd('操作名称')
```

输出格式：
```
<时间戳>|<进程>|info|d=149|<操作名称>
```

## 重要技术迁移

### lodash-es 迁移（2025 年 11 月）

项目已完成从 `lodash` 到 `lodash-es` 的迁移，带来以下优势：

#### 迁移收益
1. ✅ **更好的 Tree-shaking**: ES 模块支持，未使用的代码会被自动剔除
2. ✅ **减小打包体积**: 只包含实际使用的函数
3. ✅ **现代化**: 完全兼容 ES 模块规范
4. ✅ **面向未来**: 符合现代 JavaScript 最佳实践

#### 导入语法变化
```javascript
// 旧语法
import { find } from 'lodash';
// 或
import find from 'lodash.find';

// 新语法
import find from 'lodash-es/find.js';
```

#### 迁移详情
- **迁移日期**: 2025 年 11 月
- **版本**: 5.1.2
- **范围**: 所有包中的 lodash 引用
- **兼容性**: 无 API 破坏性变更

### tsdown 编译器迁移

从 `tsc` 迁移到 `tsdown`：

- ✅ **更快的编译速度**
- ✅ **更好的开发体验**
- ✅ **保持完全兼容**

受影响的命令：
- `pnpm compile-all` - 使用 tsdown 编译
- `pnpm watch-all` - 使用 tsdown --watch

## 构建和发布

### 构建配置

**应用 ID**: `com.Haiku.HaikuForDesignersAndEngineers`  
**产品名称**: Haiku

### 支持平台

#### macOS
- 目标格式: DMG
- 代码签名: 启用（带公证）
- 分类: 开发者工具

#### Windows
- 目标格式: NSIS 安装程序
- 架构: x64

#### Linux
- 目标格式: DEB 包
- 类别: Graphics;Development;VectorGraphics

### 发布流程

```bash
# 开发构建
pnpm dev

# 生产构建
pnpm prebuild
```

构建产物位于 `out/` 目录。

### 下载安装

- **稳定版本**: https://github.com/HaikuTeam/animator/releases/
- **从源码运行**: 遵循开发部分的说明

## 项目历史

### 商业化阶段（至 2021 年 8 月）
- 由 **Haiku Systems Inc.** 商业化开发
- 总部位于美国加利福尼亚州旧金山
- 团队分布于全球各地
- 提供协作和云存储服务

### 开源转型（2021 年 8 月至今）
- Haiku 关闭商业协作/存储服务后开源
- 移除了发布和分享链接功能
- 完全免费使用
- 接受社区维护者

### 当前状态
项目处于开源维护状态，欢迎新的维护者加入。虽然代码库存在一些深层次的缺陷（开发团队承认），但对于热衷于创意赋能的开发者来说，它仍然具有巨大潜力。

## 贡献指南

### 参与方式
1. **提交 PR**: 提交拉取请求
2. **报告问题**: 创建 Issue
3. **加入社区**: [Slack 社区邀请链接](https://join.slack.com/t/haiku-community/shared_invite/zt-4u3snz0w-vcL8qttFFHvlrZNl8NSmPg)

### 提交前检查清单
```bash
# 1. 代码检查
pnpm lint-all

# 2. 运行测试
pnpm test-all

# 3. 编译验证
pnpm compile-all

# 4. 推送代码
git push
```

## 关键脚本说明

```json
{
  "go": "pnpm start default",           // 快速启动（默认配置）
  "start": "electron-vite preview",     // 启动 Electron 预览
  "dev": "electron-vite dev",           // 开发模式
  "compile-all": "编译所有包",
  "lint-all": "检查所有代码",
  "test-all": "运行所有测试",
  "watch-all": "监听所有包变化",
  "setup": "初始化项目",
  "doctor": "诊断项目问题"
}
```

## 许可证

### 项目源代码
- **许可证**: AGPL（GNU Affero General Public License）
- **开源**: 完全开源

### 用户创建的项目
- 使用 Haiku Animator 创建的项目**完全属于用户**
- 用户可以自由许可、出售或发布自己的作品
- 不受项目源代码许可证限制

## 相关资源

- **官方网站**: https://www.haikuanimator.com/
- **GitHub 仓库**: https://github.com/HaikuTeam/animator
- **发布页面**: https://github.com/HaikuTeam/animator/releases/
- **Slack 社区**: [邀请链接](https://join.slack.com/t/haiku-community/shared_invite/zt-4u3snz0w-vcL8qttFFHvlrZNl8NSmPg)

## 常见问题排查

### Windows 环境

#### 预编译二进制文件错误
```bash
pnpm electron-rebuild
```

#### Figma 集成问题
设置环境变量：
```powershell
$env:FIGMA_TOKEN = "your-figma-token"
```

### 通用问题

#### 环境变量配置
在项目根目录创建 `.env` 文件，参考 `.env.example`：
```bash
HAIKU_API=<API地址>
# 其他配置...
```

## 总结

Haiku Animator 是一个功能强大的开源动画设计工具，具有以下特点：

✅ **全功能**: 涵盖从设计到导出的完整工作流  
✅ **现代化**: 采用最新技术栈（React 18、Electron 35、TypeScript 5.6）  
✅ **模块化**: Monorepo 架构，职责分离清晰  
✅ **可扩展**: 开源协议，支持社区贡献  
✅ **专业级**: 适用于企业和教育场景  
✅ **跨平台**: 支持 macOS、Windows 和 Linux  

该项目为动效设计师和开发者提供了一个完整的、专业级的动画创作平台，适合希望创建高质量 Lottie 动画和交互式组件的团队使用。
