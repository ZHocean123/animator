# 贡献指南

感谢您对 Haiku Animator 项目的关注！我们欢迎各种形式的贡献，包括但不限于代码提交、错误报告、功能请求和文档改进。

## 目录

- [开发环境设置](#开发环境设置)
- [代码贡献流程](#代码贡献流程)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [构建系统](#构建系统)
- [提交 Pull Request](#提交-pull-request)
- [社区准则](#社区准则)

## 开发环境设置

### 1. 先决条件

- Node.js 22（推荐使用 nvm 管理）
- Yarn 1.13.0
- Git
- 适合您操作系统的构建工具

### 2. 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/HaikuTeam/animator.git
   cd animator
   ```

2. **安装 Node.js 22**
   ```bash
   nvm install 22
   nvm alias default 22
   nvm use 22
   ```

3. **安装 Yarn**
   ```bash
   curl -o- -L https://yarnpkg.com/install.sh | bash -s -- --version 1.13.0
   ```

4. **安装项目依赖**
   ```bash
   yarn install && yarn setup
   ```

### 3. 验证安装

```bash
# 检查 Node.js 版本
node --version  # 应显示 v22.x.x

# 检查构建系统
yarn build-all

# 运行测试
yarn test-all
```

## 代码贡献流程

1. **Fork 仓库** - 在 GitHub 上 fork 项目仓库
2. **创建分支** - 为您的贡献创建一个新分支
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **开发** - 进行必要的代码更改
4. **测试** - 确保所有测试通过
5. **提交** - 提交您的更改
6. **推送** - 推送到您的 fork
7. **创建 Pull Request** - 在 GitHub 上创建 PR

## 代码规范

### TypeScript/JavaScript 规范

- 使用 TypeScript 进行开发
- 遵循项目的 ESLint 配置
- 使用有意义的变量和函数名
- 添加适当的注释和文档

### 代码格式化

```bash
# 检查代码风格
yarn lint-all

# 自动修复可修复的问题
yarn fix
```

### 提交信息规范

使用清晰、描述性的提交信息：

```
type(scope): description

[optional body]

[optional footer]
```

类型包括：
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(core): add new animation export feature

Add support for exporting animations as WebM format
with configurable quality settings.

Closes #123
```

## 测试指南

### 运行测试

```bash
# 运行所有测试
yarn test-all

# 运行特定包的测试
cd packages/[package-name]
yarn test

# 生成测试覆盖率报告
yarn test-report
```

### 编写测试

- 为新功能编写单元测试
- 确保测试覆盖边界情况
- 使用描述性的测试名称
- 保持测试简单和专注

## 构建系统

Haiku Animator 使用 tsdown 作为主要构建系统，这是一个基于 esbuild 的快速 TypeScript 构建工具。

### 构建命令

```bash
# 构建所有包
yarn build-all

# 开发模式（带文件监听）
yarn dev-all

# 构建特定包
cd packages/[package-name]
yarn build

# 开发模式特定包
cd packages/[package-name]
yarn dev
```

### 构建配置

项目使用以下配置文件：

- `tsdown.config.ts` - 根级别 tsdown 配置
- `tsconfig.base.json` - 基础 TypeScript 配置
- `packages/[package-name]/tsdown.config.ts` - 包特定的 tsdown 配置

### 开发工作流

1. **启动开发服务器**
   ```bash
   yarn start
   ```

2. **监听文件变化**
   ```bash
   yarn watch-all
   ```

3. **构建项目**
   ```bash
   yarn build-all
   ```

## 调试

### VS Code 调试配置

项目包含用于调试 UI 组件的 VS Code 配置。要使用这些配置：

1. 安装 `Debugger for Chrome` VS Code 扩展
2. 正常启动应用程序
3. 从 VS Code 的调试菜单中选择适当的配置：
   - `attach-glass`
   - `attach-timeline`
   - `attach-creator`

### 调试端口

- Plumbing: 端口 9221
- Electron 渲染进程: 端口 9222

## 提交 Pull Request

### PR 准备清单

在提交 PR 之前，请确保：

- [ ] 代码符合项目风格指南
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息清晰描述
- [ ] 没有合并冲突
- [ ] PR 描述清楚说明了更改内容

### PR 模板

使用项目提供的 [PR 模板](./PULL_REQUEST_TEMPLATE.md) 来创建您的 Pull Request。

## 社区准则

### 行为准则

我们致力于为每个人提供友好、安全和欢迎的环境。请：

- 尊重不同的观点和经验
- 使用友好和包容的语言
- 专注于对社区最有利的事情
- 对其他社区成员表示同理心

### 获取帮助

如果您需要帮助或有疑问：

1. 查看 [Issues 页面](https://github.com/HaikuTeam/animator/issues)
2. 搜索现有的问题和解决方案
3. 创建新的 Issue 描述您的问题
4. 加入 [Slack 社区](https://join.slack.com/t/haiku-community/shared_invite/zt-4u3snz0w-vcL8qttFFHvlrZNl8NSmPg)

## 认可贡献者

我们感谢所有为 Haiku Animator 做出贡献的人。您的贡献将被记录在项目的贡献者列表中。

## 许可证

通过贡献代码，您同意您的贡献将在与项目相同的 [AGPL 许可证](./LICENSE.md) 下授权。

---

再次感谢您的贡献！每一个贡献，无论大小，都使 Haiku Animator 变得更好。