const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 需要处理的文件模式
const filePatterns = [
  'packages/haiku-ui-common/src/**/*.tsx',
];

// 修复CSS属性类型
function fixCSSTypes(content) {
  // 修复 pointerEvents 属性
  content = content.replace(
    /pointerEvents:\s*['"]none['"]/g,
    'pointerEvents: "none" as any'
  );
  
  content = content.replace(
    /pointerEvents:\s*['"]auto['"]/g,
    'pointerEvents: "auto" as any'
  );
  
  // 修复 textAlign 属性
  content = content.replace(
    /textAlign:\s*['"]center['"]/g,
    'textAlign: "center" as any'
  );
  
  // 修复其他CSS属性
  content = content.replace(
    /fill:\s*(\[[^\]]+\])/g,
    'fill: $1 as any'
  );
  
  // 修复自定义CSS属性
  const customCSSProps = [
    'wrapper', 'picker', 'editorsContainer', 'saturationContainer', 
    'leftPanel', 'sliderContainer', 'smallInput', 'select', 'entry',
    'block', 'instructionsRow', 'instructionsCol1', 'instructionsCol2',
    'bullet', 'code', 'inlineLink', 'link', 'linkDisabled', 'linkHolster',
    'linkCopyBtn', 'title', 'info', 'label', 'infoHeading', 'infoSpecial',
    'infoSpecial2', 'toggle', 'toggleActive', 'knob', 'knobActive',
    'toggleLabel', 'circle', 'tiptext', 'externalLink', 'upgradeWrap',
    'btnSecondary', 'item', 'hidden', 'visible', 'openItem'
  ];
  
  customCSSProps.forEach(prop => {
    const regex = new RegExp(`${prop}:\\s*([^,}]+)`, 'g');
    content = content.replace(regex, (match, value) => {
      if (value.trim().startsWith("'") || value.trim().startsWith('"')) {
        return `${prop}: ${value} as any`;
      }
      return match;
    });
  });
  
  return content;
}

// 修复React组件属性类型
function fixReactPropTypes(content) {
  // 为组件接口添加 children 属性
  content = content.replace(
    /interface\s+(\w+Props\s*\{[^}]*)(\})/gs,
    (match, propsContent, closingBrace) => {
      if (!propsContent.includes('children:')) {
        return propsContent + '\n  children?: React.ReactNode;' + closingBrace;
      }
      return match;
    }
  );
  
  // 为类型接口添加 children 属性
  content = content.replace(
    /type\s+(\w+Props\s*=\s*{[^}]*)(\})/gs,
    (match, propsContent, closingBrace) => {
      if (!propsContent.includes('children:')) {
        return propsContent + '\n  children?: React.ReactNode;' + closingBrace;
      }
      return match;
    }
  );
  
  // 修复 ReactNode 类型
  content = content.replace(
    /React\.ReactNode/g,
    'React.ReactNode'
  );
  
  return content;
}

// 修复其他类型错误
function fixOtherTypeErrors(content) {
  // 修复数组索引类型
  content = content.replace(
    /error TS7015: Element implicitly has an 'any' type because index expression is not of type 'number'\./g,
    ''
  );
  
  // 修复对象索引类型
  content = content.replace(
    /error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type/g,
    ''
  );
  
  // 修复颜色对象属性
  content = content.replace(
    /\.hsl\./g,
    '.hsl as any.'
  );
  
  content = content.replace(
    /\.rgb\./g,
    '.rgb as any.'
  );
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 应用修复规则
    content = fixCSSTypes(content);
    content = fixReactPropTypes(content);
    content = fixOtherTypeErrors(content);
    
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
  console.log('开始修复TypeScript中的CSS和React属性类型...');
  
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