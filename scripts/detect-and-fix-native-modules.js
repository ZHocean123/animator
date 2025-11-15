#!/usr/bin/env node

/**
 * 自动化原生模块检测和修复工具
 * 用于检测和修复 nodegit 等原生模块的构建问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NativeModuleFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.issues = [];
    this.solutions = [];
  }

  /**
   * 主检测和修复流程
   */
  async run() {
    console.log('🔧 原生模块检测和修复工具');
    console.log('====================================\n');

    // 检测 nodegit 问题
    await this.detectNodeGitIssues();

    if (this.issues.length === 0) {
      console.log('✅ 所有原生模块状态正常');
      return 0;
    }

    console.log(`发现 ${this.issues.length} 个问题:\n`);

    // 输出问题详情
    this.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.severity}: ${issue.message}`);
      if (issue.details) {
        console.log(`   ${issue.details}`);
      }
    });

    console.log('');

    // 输出解决方案
    console.log('💡 建议的解决方案:\n');
    this.solutions.forEach((solution, index) => {
      console.log(`${index + 1}. ${solution.title}`);
      console.log(`   ${solution.description}`);
      if (solution.commands && solution.commands.length > 0) {
        console.log('   执行命令:');
        solution.commands.forEach(cmd => console.log(`     $ ${cmd}`));
      }
    });

    // 自动生成修复脚本
    await this.generateFixScript();

    // 尝试自动应用基本修复
    await this.applyBasicFixes();

    return 0;
  }

  /**
   * 检测 nodegit 相关问题
   */
  async detectNodeGitIssues() {
    const nodegitPath = path.join(this.projectRoot, 'node_modules', 'nodegit');
    const nodegitBuildPath = path.join(nodegitPath, 'build', 'Release', 'nodegit.node');
    const nodegitBuildPathDebug = path.join(nodegitPath, 'build', 'Debug', 'nodegit.node');
    const nodegitPackageJson = path.join(nodegitPath, 'package.json');

    console.log('🔍 检测 nodegit 模块状态...');

    // 检查 nodegit 是否安装
    if (!fs.existsSync(nodegitPath)) {
      this.issues.push({
        severity: 'ERROR',
        module: 'nodegit',
        message: 'nodegit 模块未安装',
        details: '需要先运行 pnpm install'
      });
      this.solutions.push({
        title: '安装 nodegit 模块',
        description: '运行 pnpm install 安装所有依赖',
        commands: ['pnpm install']
      });
      return;
    }

    // 检查 package.json
    if (!fs.existsSync(nodegitPackageJson)) {
      this.issues.push({
        severity: 'ERROR',
        module: 'nodegit',
        message: 'nodegit package.json 缺失',
        details: '模块可能损坏，需要重新安装'
      });
      this.solutions.push({
        title: '重新安装 nodegit',
        description: '删除并重新安装 nodegit',
        commands: ['rm -rf node_modules/nodegit', 'pnpm install']
      });
      return;
    }

    // 读取版本信息
    const packageJson = JSON.parse(fs.readFileSync(nodegitPackageJson, 'utf8'));
    const nodegitVersion = packageJson.version;

    // 检查构建文件
    if (fs.existsSync(nodegitBuildPath)) {
      console.log(`✅ nodegit ${nodegitVersion} 已正确构建`);
      
      // 检查文件大小
      const stats = fs.statSync(nodegitBuildPath);
      if (stats.size < 1000) {
        this.issues.push({
          severity: 'WARNING',
          module: 'nodegit',
          message: 'nodegit 构建文件过小',
          details: `文件大小: ${stats.size} bytes，可能构建不完整`
        });
      }
      return;
    }

    // 检查 Debug 版本
    if (fs.existsSync(nodegitBuildPathDebug)) {
      this.issues.push({
        severity: 'WARNING',
        module: 'nodegit',
        message: 'nodegit 只有 Debug 版本，缺少 Release 版本',
        details: '尝试复制 Debug 版本到 Release'
      });
      this.solutions.push({
        title: '复制 Debug 版本到 Release',
        description: '创建 Release 目录并复制二进制文件',
        commands: [
          'mkdir -p node_modules/nodegit/build/Release',
          'cp node_modules/nodegit/build/Debug/nodegit.node node_modules/nodegit/build/Release/'
        ]
      });
      return;
    }

    // 检查 Node.js 版本兼容性
    const nodeVersion = process.versions.node.split('.')[0];
    const incompatibleVersions = {
      '0.20.3': { maxNode: 14 },
      '0.27.0': { maxNode: 18 },
      '0.28.0': { maxNode: 20 }
    };

    const nodegitData = incompatibleVersions[nodegitVersion];
    if (nodegitData && parseInt(nodeVersion) > nodegitData.maxNode) {
      this.issues.push({
        severity: 'ERROR',
        module: 'nodegit',
        message: `Node.js ${nodeVersion}.x 与 nodegit ${nodegitVersion} 不兼容`,
        details: `该版本的 nodegit 最高支持 Node.js ${nodegitData.maxNode}.x`
      });
    } else {
      this.issues.push({
        severity: 'ERROR',
        module: 'nodegit',
        message: 'nodegit 未构建成功',
        details: '原生模块缺失，需要重新构建'
      });
    }

    // 添加通用解决方案
    this.solutions.push({
      title: '使用 Docker 构建 (推荐)',
      description: '使用 Node.js 18 容器重新构建所有模块',
      commands: [
        'docker run --rm -v $(pwd):/app -w /app node:18-slim bash -c "rm -rf node_modules && npm install -g pnpm && pnpm install"'
      ]
    });

    this.solutions.push({
      title: '使用 nvm 切换 Node.js 版本',
      description: '安装并使用 Node.js 18.x',
      commands: [
        'nvm install 18',
        'nvm use 18',
        'rm -rf node_modules && pnpm install'
      ]
    });

    this.solutions.push({
      title: '创建 mock 模块',
      description: '创建 mock 实现以允许应用启动（禁用 git 功能）',
      commands: ['./scripts/fix-nodegit-issue.sh']
    });
  }

  /**
   * 生成修复脚本
   */
  async generateFixScript() {
    const scriptPath = path.join(this.projectRoot, 'scripts', 'apply-fixes.sh');
    
    const scriptContent = `#!/bin/bash
# 自动生成的修复脚本
# 生成时间: ${new Date().toISOString()}

set -e

echo "🔧 应用原生模块修复..."
echo ""

${this.solutions.map((solution, index) => `
# 解决方案 ${index + 1}: ${solution.title}
echo "${index + 1}. ${solution.title}"
echo "   ${solution.description}"
if [ "${solution.commands ? solution.commands.join(' && ') : ''}" ]; then
  ${solution.commands ? solution.commands.map(cmd => `  echo "   执行: ${cmd}" && ${cmd}`).join('\n') : ''}
  echo "   ✅ 完成"
else
  echo "   ⚠️  需要手动执行"
fi
echo ""
`).join('\n')}

echo "✅ 所有修复已应用"
echo ""
echo "📋 下一步操作："
echo "1. 重新启动应用程序"
echo "2. 检查是否还有其他错误"
echo "3. 如果问题仍然存在，请查看详细信息"
`;

    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, 0o755);

    console.log(`📄 修复脚本已生成: ${scriptPath}`);
  }

  /**
   * 应用基本修复
   */
  async applyBasicFixes() {
    const nodegitMockPath = path.join(this.projectRoot, 'node_modules', 'nodegit', 'build', 'Release', 'nodegit.node.js');
    
    // 创建 mock 模块
    if (!fs.existsSync(path.dirname(nodegitMockPath))) {
      fs.mkdirSync(path.dirname(nodegitMockPath), { recursive: true });
    }

    const mockContent = `// nodegit mock 模块 - 当原生模块不可用时使用
console.warn('⚠️  使用 nodegit mock 模块，git 功能将被禁用');

module.exports = {
  Repository: {
    open: () => Promise.reject(new Error('Git 功能已禁用 - nodegit 原生模块未正确构建'))
  },
  Clone: {
    clone: () => Promise.reject(new Error('Git 功能已禁用 - nodegit 原生模块未正确构建'))
  },
  // 基本的错误处理
  Status: {
    file: () => Promise.resolve({ isNew: () => false })
  },
  Reference: {
    list: () => Promise.resolve([]),
    lookup: () => Promise.reject(new Error('Git 功能已禁用'))
  },
  Branch: {
    lookup: () => Promise.reject(new Error('Git 功能已禁用'))
  },
  Commit: {
    lookup: () => Promise.reject(new Error('Git 功能已禁用'))
  },
  // 导出基本的错误类型
  Error: Error
};
`;

    fs.writeFileSync(nodegitMockPath, mockContent);
    console.log('🛠️  已创建 nodegit mock 模块作为备用方案');
  }
}

// 运行工具
if (require.main === module) {
  const fixer = new NativeModuleFixer();
  fixer.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('❌ 工具执行失败:', error);
    process.exit(1);
  });
}

module.exports = NativeModuleFixer;