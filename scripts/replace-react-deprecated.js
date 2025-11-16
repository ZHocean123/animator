



// 需要处理的文件模式

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import glob from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePatterns = [
  'packages/haiku-creator/src/react/**/*.js',
  'packages/haiku-glass/src/react/**/*.js',
  'packages/haiku-timeline/src/components/**/*.js',
];

// 替换规则
const replacements = [
  // 替换生命周期方法
  {
    search: /componentWillReceiveProps\s*\(([^)]+)\)\s*{/g,
    replace: (match, params) => {
      // 将参数名从 nextProps 改为 prevProps
      const newParams = params.replace(/nextProps/g, 'prevProps');
      return `componentDidUpdate (${newParams}) {`;
    }
  },
  {
    search: /componentWillUpdate\s*\([^)]+\)\s*{/g,
    replace: 'getSnapshotBeforeUpdate (prevProps, prevState) {'
  },
  {
    search: /componentWillMount\s*\(\)\s*{/g,
    replace: 'componentDidMount () {'
  },
  // 替换 PropTypes
  {
    search: /React\.PropTypes\./g,
    replace: 'PropTypes.'
  }
];

// 添加 PropTypes 导入
function addPropTypesImport(content) {
  if (content.includes('React.PropTypes') || content.includes('PropTypes')) {
    if (!content.includes("import PropTypes from 'prop-types'")) {
      // 在第一个 React 导入后添加 PropTypes 导入
      return content.replace(
        /(import \* as React from ['"]react['"];)/,
        "$1\nimport PropTypes from 'prop-types';"
      );
    }
  }
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 添加 PropTypes 导入
    content = addPropTypesImport(content);
    
    // 应用替换规则
    replacements.forEach(({search, replace}) => {
      content = content.replace(search, replace);
    });
    
    // 修复 componentDidUpdate 中的参数使用
    content = content.replace(
      /componentDidUpdate\s*\([^)]+\)\s*{[\s\S]*?}/g,
      (match) => {
        // 将方法内部对 nextProps 的引用改为 this.props
        return match.replace(/nextProps\./g, 'this.props.');
      }
    );
    
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
  console.log('开始替换React废弃功能...');
  
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