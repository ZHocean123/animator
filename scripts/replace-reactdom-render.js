



// 需要处理的文件模式

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import glob from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePatterns = [
  'packages/haiku-glass/src/react/index.js',
  'packages/haiku-timeline/src/index.js',
  'packages/haiku-glass/test/TestHelpers.js',
  'packages/haiku-timeline/test/TestHelpers.js',
];

// 替换规则
function replaceReactDOMRender(content) {
  // 添加 createRoot 导入
  if (content.includes('ReactDOM.render') && !content.includes('createRoot')) {
    content = content.replace(
      /(import.*ReactDOM.*from ['"]react-dom['"];)/,
      "$1\nimport { createRoot } from 'react-dom/client';"
    );
  }
  
  // 替换 ReactDOM.render 为 createRoot
  content = content.replace(
    /ReactDOM\.render\(\s*([^,]+),\s*([^)]+)\)/g,
    (match, element, container) => {
      // 检查是否已经有 root 变量
      const rootVarName = 'root';
      return `const ${rootVarName} = createRoot(${container});\n  ${rootVarName}.render(${element})`;
    }
  );
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用替换规则
    content = replaceReactDOMRender(content);
    
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
  console.log('开始替换ReactDOM.render...');
  
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