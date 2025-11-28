# 迁移指南：从 Node.js 8.15.1 和 tsc 到 Node.js 22 和 tsdown

本指南详细说明了如何从旧版本的 Haiku Animator（使用 Node.js 8.15.1 和 TypeScript 编译器）迁移到新版本（使用 Node.js 22 和 tsdown 构建系统）。

## 目录

- [概述](#概述)
- [先决条件](#先决条件)
- [Node.js 升级](#nodejs-升级)
- [构建系统迁移](#构建系统迁移)
- [常见问题和解决方案](#常见问题和解决方案)
- [回滚指南](#回滚指南)
- [获取帮助](#获取帮助)

## 概述

Haiku Animator 已完成以下重大升级：

1. **Node.js 版本升级**：从 8.15.1 升级到 22
2. **构建系统迁移**：从 TypeScript 编译器 (tsc) 迁移到 tsdown
3. **TypeScript 配置更新**：使用更严格的类型检查和现代 TypeScript 特性

这些升级带来了以下好处：

- 更快的构建速度
- 更好的开发体验
- 改进的错误处理
- 更强的类型安全
- 现代化的 JavaScript/TypeScript 特性支持

## 先决条件

在开始迁移之前，请确保：

1. 备份您的项目
2. 确保所有依赖项与 Node.js 22 兼容
3. 检查是否有任何自定义构建脚本需要更新

## Node.js 升级

### 1. 安装 Node.js 22

#### 使用 nvm（推荐）

```bash
# 安装 Node.js 22
nvm install 22

# 设置为默认版本
nvm alias default 22

# 使用新版本
nvm use 22
```

#### 使用其他包管理器

**Windows（使用 Chocolatey）：**

```bash
choco install nodejs-lts -y --version 22
```

**macOS（使用 Homebrew）：**

```bash
brew install node@22
```

**Linux（使用包管理器）：**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.6/install.sh | bash
nvm install 22 && nvm alias default 22 && nvm use 22
```

### 2. 验证安装

```bash
node --version  # 应显示 v22.x.x
npm --version   # 确保npm版本兼容
```

### 3. 更新项目依赖

```bash
# 清理旧的依赖
rm -rf node_modules
rm package-lock.json

# 重新安装依赖
npm install
# 或使用 pnpm
pnpm install
```

## 构建系统迁移

### 1. tsdown 简介

tsdown 是一个基于 esbuild 的 TypeScript 构建工具，提供以下优势：

- 更快的构建速度（比 tsc 快 10-100 倍）
- 内置开发服务器和热重载
- 更好的打包支持
- 简化的配置

### 2. 新的构建命令

#### 旧命令（tsc）

```bash
# 编译所有包
pnpm compile-all

# 监听文件变化
pnpm watch-all
```

#### 新命令（tsdown）

```bash
# 构建所有包
pnpm build-all

# 开发模式（带文件监听）
pnpm dev-all

# 构建特定包
cd packages/[package-name]
pnpm build

# 开发模式特定包
cd packages/[package-name]
pnpm dev
```

### 3. 配置文件变更

项目现在使用以下配置文件：

- `tsdown.config.ts` - 根级别 tsdown 配置
- `tsconfig.base.json` - 基础 TypeScript 配置
- `packages/[package-name]/tsdown.config.ts` - 包特定的 tsdown 配置

### 4. 自定义构建脚本

如果您有自定义构建脚本，可能需要更新它们以使用 tsdown 而不是 tsc。

#### 旧脚本示例

```json
{
  "scripts": {
    "compile": "tsc",
    "watch": "tsc --watch"
  }
}
```

#### 新脚本示例

```json
{
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch"
  }
}
```

## 常见问题和解决方案

### 1. 依赖项兼容性问题

**问题**：某些依赖项可能与 Node.js 22 不兼容。

**解决方案**：

1. 检查依赖项的文档，确认是否支持 Node.js 22
2. 更新到最新版本的依赖项
3. 如果仍有问题，考虑使用兼容性层或替代库

### 2. 构建错误

**问题**：tsdown 可能与 tsc 在某些边缘情况下行为不同。

**解决方案**：

1. 检查 `tsdown.config.ts` 配置是否正确
2. 确保 TypeScript 代码符合更严格的类型检查
3. 查看构建日志中的具体错误信息

### 3. 性能问题

**问题**：初始构建可能较慢，因为 tsdown 需要创建缓存。

**解决方案**：

1. 首次构建后，后续构建会快很多
2. 确保 `node_modules` 有适当的写入权限
3. 考虑使用 SSD 以获得更好的性能

### 4. 开发服务器问题

**问题**：热重载或开发服务器可能不工作。

**解决方案**：

1. 检查端口是否被占用
2. 确保防火墙设置允许本地连接
3. 尝试清除浏览器缓存

### 5. 类型错误

**问题**：新的 TypeScript 配置更严格，可能暴露之前未发现的类型错误。

**解决方案**：

1. 修复类型错误，这是提高代码质量的机会
2. 如果需要，可以暂时放宽某些类型检查规则
3. 使用 `// @ts-ignore` 或 `// @ts-expect-error` 作为临时解决方案

## 回滚指南

如果遇到无法解决的问题，您可以考虑回滚到之前的版本：

### 1. 回滚 Node.js 版本

```bash
# 使用 nvm 回滚
nvm install 8.15.1
nvm alias default 8.15.1
nvm use 8.15.1
```

### 2. 恢复旧构建系统

1. 恢复 `package.json` 中的旧脚本
2. 恢复旧的 `tsconfig.json` 文件
3. 删除 `tsdown.config.ts` 文件
4. 重新安装依赖项

### 3. 使用 Git 回滚

```bash
# 查看提交历史
git log --oneline

# 回滚到升级前的提交
git checkout [commit-hash]

# 创建新分支从该提交
git checkout -b rollback-branch
```

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看项目的 [Issues 页面](https://github.com/HaikuTeam/animator/issues)
2. 搜索现有的问题和解决方案
3. 如果没有找到解决方案，创建新的 Issue，详细描述您的问题
4. 加入 [Slack 社区](https://join.slack.com/t/haiku-community/shared_invite/zt-4u3snz0w-vcL8qttFFHvlrZNl8NSmPg) 获取实时帮助

## 迁移检查清单

- [ ] 备份项目
- [ ] 安装 Node.js 22
- [ ] 更新项目依赖
- [ ] 测试新构建命令
- [ ] 更新自定义构建脚本
- [ ] 运行测试套件
- [ ] 检查开发环境
- [ ] 验证生产构建
- [ ] 更新团队文档

---

**注意**：虽然我们已经尽力确保迁移过程顺利，但复杂项目可能仍会遇到意外问题。请耐心处理，并随时寻求帮助。
