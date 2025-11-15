#!/bin/bash

# 诊断和修复 nodegit 原生模块加载错误
# 此脚本检测 nodegit 构建问题并提供解决方案

set -e

echo "🔍 诊断 nodegit 原生模块构建状态..."
echo ""

# 检查当前环境
echo "📊 环境信息:"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "Python 版本: $(python3 --version)"
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules 目录不存在，请先运行 pnpm install"
  exit 1
fi

# 检查 nodegit 是否存在
if [ ! -d "node_modules/nodegit" ]; then
  echo "❌ nodegit 模块未安装"
  exit 1
fi

# 检查构建目录
if [ -f "node_modules/nodegit/build/Release/nodegit.node" ]; then
  echo "✅ nodegit 已正确构建"
  echo ""
  echo "📦 构建文件信息:"
  ls -la node_modules/nodegit/build/Release/
  exit 0
fi

echo "❌ nodegit 未正确构建"
echo ""

# 检查是否有 Debug 版本
if [ -f "node_modules/nodegit/build/Debug/nodegit.node" ]; then
  echo "⚠️  发现 Debug 版本，但 Release 版本缺失"
  echo "尝试复制 Debug 版本到 Release..."
  mkdir -p node_modules/nodegit/build/Release/
  cp node_modules/nodegit/build/Debug/nodegit.node node_modules/nodegit/build/Release/
  echo "✅ 已复制 Debug 版本到 Release"
  exit 0
fi

echo "🔧 问题分析:"
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
echo "Node.js 主版本: $NODE_VERSION"

if [ "$NODE_VERSION" -ge 22 ]; then
  echo "⚠️  Node.js $NODE_VERSION.x 与 nodegit 0.27.0 不兼容"
  echo "   建议解决方案:"
  echo "   1. 使用 Node.js 18.x (推荐)"
  echo "   2. 使用 Docker 容器"
  echo "   3. 跳过 git 相关功能"
  echo ""
fi

# 提供快速修复选项
echo "💡 快速修复选项:"
echo ""

echo "选项 1: 使用 Docker (推荐)"
echo "   docker run --rm -v \$(pwd):/app -w /app node:18-slim bash -c '"
echo "     rm -rf node_modules"
echo "     npm install -g pnpm"
echo "     pnpm install"
echo "   '"
echo ""

echo "选项 2: 使用 nvm 切换 Node.js 版本"
echo "   nvm install 18"
echo "   nvm use 18"
echo "   rm -rf node_modules && pnpm install"
echo ""

echo "选项 3: 完全跳过 nodegit (禁用 git 功能)"
echo "   在代码中检测 nodegit 是否可用，如果不可用则使用 mock 实现"
echo ""

# 创建 mock 模块作为备用方案
echo "🛠️  创建 nodegit mock 模块作为备用方案..."
mkdir -p node_modules/nodegit/build/Release/

cat > node_modules/nodegit/build/Release/nodegit.node.js << 'EOF'
// nodegit mock 模块 - 当原生模块不可用时使用
console.warn('⚠️  使用 nodegit mock 模块，git 功能将被禁用');

module.exports = {
  Repository: {
    open: () => Promise.reject(new Error('Git 功能已禁用 - nodegit 原生模块未正确构建'))
  },
  Clone: {
    clone: () => Promise.reject(new Error('Git 功能已禁用 - nodegit 原生模块未正确构建'))
  },
  // 其他 API 也需要 mock
  // 根据实际使用情况添加更多 mock 实现
};
EOF

echo "✅ 已创建 mock 模块"
echo ""

echo "📋 建议操作:"
echo "1. 优先使用选项 1 或 2 修复原生模块"
echo "2. 如果无法修复，应用程序将使用 mock 模块"
echo "3. mock 模块会使 git 相关功能不可用，但其他功能正常"
echo ""

exit 0