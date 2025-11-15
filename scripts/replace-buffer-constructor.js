const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 需要处理的文件模式
const filePatterns = [
  'packages/haiku-plumbing/test/git/git1.js',
  'packages/haiku-fs-extra/lib/copy-sync/copy-file-sync.js',
];

// 替换规则
function replaceBufferConstructor(content) {
  // 替换 new Buffer('') 为 Buffer.from('')
  content = content.replace(
    /new Buffer\(\s*(['"])([^'"]*)\1\s*\)/g,
    'Buffer.from($1$2$1)'
  );
  
  // 替换 new Buffer(str, encoding) 为 Buffer.from(str, encoding)
  content = content.replace(
    /new Buffer\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    'Buffer.from($1, $2)'
  );
  
  // 替换 new Buffer(array) 为 Buffer.from(array)
  content = content.replace(
    /new Buffer\(\s*([^'"][^)]*)\s*\)/g,
    'Buffer.from($1)'
  );
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用替换规则
    content = replaceBufferConstructor(content);
    
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
  console.log('开始替换废弃的Buffer构造函数...');
  
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