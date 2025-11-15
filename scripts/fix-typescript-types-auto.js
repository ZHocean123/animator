#!/usr/bin/env node

/**
 * 自动修复 TypeScript 类型错误
 * 主要解决 CSSProperties 和 ReactNode 类型不兼容问题
 */

const fs = require('fs');
const path = require('path');

class TypeScriptFixer {
  constructor() {
    this.stats = {
      totalFiles: 0,
      fixedCSSProperties: 0,
      fixedReactNode: 0,
      errors: []
    };
    
    // ReactNode 修复模式
    this.reactNodePatterns = [
      {
        name: 'ReactNode 类型断言',
        regex: /children\?:\s*any/g,
        replacement: 'children?: React.ReactNode',
        test: /interface.*Props|type.*Props/
      },
      {
        name: 'Element 到 ReactNode',
        regex: /\bchildren:\s*Element\b/g,
        replacement: 'children: React.ReactElement'
      },
      {
        name: '添加 React 导入',
        regex: /^import\s+\*\s+as\s+React\s+from\s+['"]react['"];?$/gm,
        replacement: null, // 特殊处理
        addIfMissing: true
      }
    ];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    const allowedExts = ['.tsx', '.ts', '.jsx', '.js'];
    const isAllowed = allowedExts.includes(ext);
    
    // 排除 node_modules 和特定目录
    const shouldExclude = filePath.includes('node_modules') || 
                         filePath.includes('bytecode-fixtures') ||
                         filePath.includes('test');
    
    return isAllowed && !shouldExclude;
  }

  fixReactNodeIssues(content, filePath) {
    let modified = false;
    let newContent = content;

    // 检查是否需要添加 React 导入
    if (!newContent.includes('import') || !newContent.match(/import.*from\s+['"]react['"]/)) {
      const hasReactUsage = newContent.includes('React.') || 
                           newContent.includes('JSX.') ||
                           newContent.match(/<\w+/);
      
      if (hasReactUsage) {
        // 在文件开头添加导入
        const lines = newContent.split('\n');
        let insertIndex = 0;
        
        // 跳过 shebang 和注释
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('#!') || lines[i].match(/^\/\/\s+@/)) {
            insertIndex = i + 1;
          } else if (lines[i].startsWith('//') || lines[i].startsWith('/*')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() && !lines[i].startsWith('//')) {
            break;
          }
        }
        
        lines.splice(insertIndex, 0, "import * as React from 'react';");
        newContent = lines.join('\n');
        modified = true;
        this.stats.fixedReactNode++;
        this.log(`  添加了 React 导入到 ${path.basename(filePath)}`, 'success');
      }
    }

    // 应用其他模式
    for (const pattern of this.reactNodePatterns) {
      if (pattern.addIfMissing) continue; // 跳过特殊的导入模式
      
      if (pattern.test && !pattern.test.test(newContent)) continue;
      
      const matches = newContent.match(pattern.regex);
      if (matches) {
        newContent = newContent.replace(pattern.regex, pattern.replacement);
        modified = true;
        this.stats.fixedReactNode += matches.length;
        this.log(`  应用 ${pattern.name}: ${matches.length} 处`, 'success');
      }
    }

    return { content: newContent, modified };
  }

  fixFile(filePath) {
    try {
      this.stats.totalFiles++;
      this.log(`处理文件: ${path.relative(process.cwd(), filePath)}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // 修复 ReactNode 问题
      const reactResult = this.fixReactNodeIssues(content, filePath);
      content = reactResult.content;
      
      if (reactResult.modified) {
        this.log(`  已修改 ReactNode 类型`, 'success');
      }

      // 只在有实际修改时写入文件
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.log(`  保存修改`, 'success');
        return true;
      } else {
        this.log(`  无需修改`, 'info');
        return false;
      }

    } catch (error) {
      this.stats.errors.push({ file: filePath, error: error.message });
      this.log(`处理失败: ${error.message}`, 'error');
      return false;
    }
  }

  processDirectory(directoryPath) {
    this.log(`开始处理目录: ${directoryPath}`);
    
    try {
      const entries = fs.readdirSync(directoryPath);
      
      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 递归处理子目录
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            this.processDirectory(fullPath);
          }
        } else if (stat.isFile() && this.shouldProcessFile(fullPath)) {
          this.fixFile(fullPath);
        }
      }
    } catch (error) {
      this.log(`无法处理目录 ${directoryPath}: ${error.message}`, 'error');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('修复报告');
    console.log('='.repeat(60));
    console.log(`处理的文件总数: ${this.stats.totalFiles}`);
    console.log(`ReactNode 修复数: ${this.stats.fixedReactNode}`);
    console.log(`CSSProperties 修复数: ${this.stats.fixedCSSProperties}`);
    console.log(`错误数: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n错误详情:');
      this.stats.errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }
    console.log('='.repeat(60));
  }

  run(targetPaths) {
    this.log('开始 TypeScript 类型自动修复');
    this.log('目标路径: ' + targetPaths.join(', '));
    
    targetPaths.forEach(targetPath => {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          this.processDirectory(targetPath);
        } else if (stat.isFile()) {
          this.fixFile(targetPath);
        }
      } else {
        this.log(`路径不存在: ${targetPath}`, 'error');
      }
    });
    
    this.generateReport();
    this.log('类型修复完成');
  }
}

// 当直接运行脚本时
if (require.main === module) {
  const args = process.argv.slice(2);
  const defaultPaths = [
    'packages/haiku-creator/src',
    'packages/haiku-timeline/src', 
    'packages/haiku-glass/src'
  ];
  
  const targetPaths = args.length > 0 ? args : defaultPaths;
  
  const fixer = new TypeScriptFixer();
  fixer.run(targetPaths);
} else {
  module.exports = TypeScriptFixer;
}