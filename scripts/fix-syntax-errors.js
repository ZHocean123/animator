



// 需要处理的文件模式

import fs from "fs";
import path from "path";
import glob from "glob";

const filePatterns = [
  'packages/haiku-ui-common/src/**/*.tsx',
];

// 修复语法错误
function fixSyntaxErrors(content) {
  // 修复接口定义
  content = content.replace(
    /export (\w+Props) \{([^}]+)\}/g,
    'export interface $1 {$2}'
  );
  
  // 修复类型定义
  content = content.replace(
    /export type (\w+Props) = \{([^}]+)\}/g,
    'export type $1Props = {$2}'
  );
  
  // 修复不完整的接口定义
  content = content.replace(
    /export (\w+Props) \{([^}]*children\?\:\s*React\.ReactNode;[^}]*)\}/g,
    'export interface $1 {$2}'
  );
  
  // 修复其他语法问题
  content = content.replace(
    /\{([^}]*)as any\}/g,
    '{$1}'
  );
  
  // 修复CSS属性类型转换
  content = content.replace(
    /:\s*([^;]+) as any/g,
    ': $1'
  );
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用修复规则
    content = fixSyntaxErrors(content);
    
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
  console.log('开始修复语法错误...');
  
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