const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 需要处理的文件模式
const filePatterns = [
  'packages/haiku-glass/src/react/Glass.js',
  'packages/haiku-creator/src/dom.js',
  'packages/haiku-timeline/src/components/Timeline.js',
  'packages/haiku-creator/src/react/Creator.js',
];

// 替换规则
function replaceElectronRemote(content) {
  // 替换 import {remote} from 'electron' 为 import * as remote from '@electron/remote'
  content = content.replace(
    /import\s*\{\s*([^}]*remote[^}]*)\s*\}\s*from\s*['"]electron['"];?/g,
    (match, imports) => {
      // 提取其他导入项
      const otherImports = imports.replace(/remote\s*,?\s*/g, '').replace(/,\s*remote\s*/g, '').trim();
      
      let result = '';
      
      // 如果有其他导入项，先导入它们
      if (otherImports) {
        result += `import { ${otherImports} } from 'electron';\n`;
      }
      
      // 然后导入 remote
      result += `import * as remote from '@electron/remote';`;
      
      return result;
    }
  );
  
  // 替换 require('electron').remote 为 require('@electron/remote')
  content = content.replace(
    /require\(['"]electron['"]\)\.remote/g,
    "require('@electron/remote')"
  );
  
  // 初始化 remote
  if (content.includes('import * as remote from \'@electron/remote\'') && 
      !content.includes('remote.initialize()')) {
    content = content.replace(
      /(import \* as remote from ['"]@electron\/remote['"];)/,
      "$1\n\n// 初始化 remote\nremote.initialize();"
    );
  }
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用替换规则
    content = replaceElectronRemote(content);
    
    fs.writeFileSync(filePath, content);
    console.log(`已处理: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`处理文件失败 ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('开始替换Electron废弃的remote模块...');
  
  let processedCount = 0;
  let failedCount = 0;
  
  filePatterns.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      if (processFile(file)) {
        processedCount++;
      } else {
        failedCount++;
      }
    });
  });
  
  console.log(`\n处理完成!`);
  console.log(`成功处理: ${processedCount} 个文件`);
  console.log(`处理失败: ${failedCount} 个文件`);
}

main();