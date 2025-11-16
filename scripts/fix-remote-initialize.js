



// 需要处理的文件模式

import fs from "fs";
import path from "path";
import glob from "glob";

const filePatterns = [
  'packages/haiku-ui-common/src/**/*.ts',
  'packages/haiku-ui-common/src/**/*.tsx',
  'packages/haiku-creator/src/**/*.ts',
  'packages/haiku-creator/src/**/*.tsx',
];

// 修复 remote.initialize() 问题
function fixRemoteInitialize(content) {
  // 移除 remote.initialize() 调用，因为在新版本中不再需要
  content = content.replace(
    /\/\/ 初始化 remote\nremote\.initialize\(\);?\n?/g,
    ''
  );
  
  content = content.replace(
    /remote\.initialize\(\);?\n?/g,
    ''
  );
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用修复规则
    content = fixRemoteInitialize(content);
    
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
  console.log('开始修复 remote.initialize() 问题...');
  
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