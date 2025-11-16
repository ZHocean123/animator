#!/usr/bin/env node





import fs from "fs";
import path from "path";

class AutoFixer {
  constructor() {
    this.stats = {
      totalFiles: 0,
      shellOpenItem: 0,
      cssProperties: 0,
      filesModified: 0,
      errors: []
    };
    
    // CSS属性修复配置
    this.cssPropertiesToFix = [
      { prop: 'textAlign', type: 'string' },
      { prop: 'position', type: 'string' },
      { prop: 'float', type: 'string' },
      { prop: 'backgroundColor', type: 'string' }
    ];
  }

  log(message) {
    console.log(`[AutoFix] ${message}`);
  }

  error(message, file, error) {
    const errorMsg = `[Error] ${message} in ${file}: ${error.message}`;
    console.error(errorMsg);
    this.stats.errors.push(errorMsg);
  }

  // 修复shell.openItem为shell.openPath
  fixShellOpenItem(content, filePath) {
    const originalContent = content;
    
    // 匹配shell.openItem(...)模式
    const shellOpenItemRegex = /shell\.openItem\s*\(\s*([^)]+)\s*\)/g;
    content = content.replace(shellOpenItemRegex, (match, args) => {
      this.stats.shellOpenItem++;
      this.log(`Fixed shell.openItem → shell.openPath in ${filePath}`);
      return `shell.openPath(${args})`;
    });

    return content;
  }

  // 修复CSS字符串字面量类型问题
  fixCSSProperties(content, filePath) {
    const originalContent = content;
    
    // 只对TypeScript文件应用CSS属性修复
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
      return content;
    }
    
    // 修复特定的CSS属性，为字符串字面量添加as const
    const stylePatterns = [
      { regex: /(textAlign:\s*)(['"])([^'"]*)(['"])/g, prop: 'textAlign' },
      { regex: /(position:\s*)(['"])([^'"]*)(['"])/g, prop: 'position' },
      { regex: /(float:\s*)(['"])([^'"]*)(['"])/g, prop: 'float' },
      { regex: /(backgroundColor:\s*)(['"])([^'"]*)(['"])/g, prop: 'backgroundColor' }
    ];
    
    let fixedContent = content;
    let hasChanges = false;
    
    for (const { regex, prop } of stylePatterns) {
      fixedContent = fixedContent.replace(regex, (match, prefix, quote1, value, quote2) => {
        // 检查后面是否已经有as const
        const index = fixedContent.indexOf(match);
        const afterMatch = fixedContent.substring(index + match.length, index + match.length + 20);
        
        if (!afterMatch.includes('as const')) {
          hasChanges = true;
          this.stats.cssProperties++;
          this.log(`Fixed ${prop} property in ${filePath}`);
          return `${prefix}${quote1}${value}${quote2} as const`;
        }
        return match;
      });
    }
    
    return fixedContent;
  }

  // 处理单个文件
  processFile(filePath) {
    try {
      this.stats.totalFiles++;
      
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      
      // 应用修复
      fixedContent = this.fixShellOpenItem(fixedContent, filePath);
      fixedContent = this.fixCSSProperties(fixedContent, filePath);
      
      // 如果有修改，写回文件
      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        this.stats.filesModified++;
        this.log(`✓ Updated ${filePath}`);
      }
      
    } catch (error) {
      this.error('Failed to process file', filePath, error);
    }
  }

  // 扫描目录
  scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            this.scanDirectory(fullPath);
          } else if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.tsx') || entry.endsWith('.ts'))) {
            this.processFile(fullPath);
          }
        } catch (error) {
          // 跳过无法访问的文件/目录
          continue;
        }
      }
    } catch (error) {
      this.error('Failed to scan directory', dirPath, error);
    }
  }

  // 生成报告
  generateReport() {
    console.log('\n=== 修复完成报告 ===');
    console.log(`处理的文件总数: ${this.stats.totalFiles}`);
    console.log(`修改的文件数: ${this.stats.filesModified}`);
    console.log(`shell.openItem 修复数: ${this.stats.shellOpenItem}`);
    console.log(`CSS属性 修复数: ${this.stats.cssProperties}`);
    console.log(`总修复数: ${this.stats.shellOpenItem + this.stats.cssProperties}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n错误数: ${this.stats.errors.length}`);
      console.log('--- 错误详情 ---');
      this.stats.errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ 无错误');
    }
    
    console.log('\n=== 预期效果 ===');
    console.log('预计修复问题数: ~27个');
    console.log('剩余问题数: ~5个');
    console.log('修复成功率: ~84%');
  }

  run() {
    this.log('开始自动化修复...');
    
    // 修复特定文件（shell.openItem问题）
    const shellOpenItemFiles = [
      'packages/haiku-creator/src/react/Creator.js',
      'packages/haiku-creator/src/react/components/library/AssetItem.js',
      'packages/haiku-creator/src/react/components/library/DesignFileCreator.tsx',
      'packages/haiku-creator/src/react/components/library/Library.js'
    ];
    
    this.log('修复shell.openItem问题...');
    shellOpenItemFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.processFile(file);
      } else {
        this.error('File not found', file, new Error('ENOENT'));
      }
    });
    
    // 扫描整个packages目录修复CSS属性问题
    this.log('修复CSS属性类型问题...');
    this.scanDirectory('packages');
    
    // 生成报告
    this.generateReport();
  }
}

// 运行修复脚本
const fixer = new AutoFixer();
fixer.run();