const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 获取命令行参数
const args = require('yargs').argv;

// 配置
const CONFIG = {
  // 跳过这些文件（已经转换或有特殊情况）
  skipFiles: [
    'scripts/start.js', // 已经转换过
    'scripts/convert-to-es-modules.js', // 转换脚本本身
  ],
  // 备份目录
  backupDir: '.backup-esm-conversion',
  // 日志级别: 'debug', 'info', 'warn', 'error'
  logLevel: args.verbose ? 'debug' : 'info',
  // 是否实际执行转换（默认只分析）
  execute: args.execute || false,
};

// 日志工具
const logger = {
  debug: (msg) => CONFIG.logLevel === 'debug' && console.log(`[DEBUG] ${msg}`),
  info: (msg) => ['debug', 'info'].includes(CONFIG.logLevel) && console.log(`[INFO] ${msg}`),
  warn: (msg) => ['debug', 'info', 'warn'].includes(CONFIG.logLevel) && console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
};

// 获取所有需要处理的 .js 文件
function getAllJsFiles() {
  const patterns = [
    'scripts/*.js',
    'scripts/helpers/*.js',
    'scripts/constants/*.js',
  ];
  
  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern);
    allFiles = allFiles.concat(files);
  });
  
  // 过滤掉不需要处理的文件
  return allFiles.filter(file => {
    return !CONFIG.skipFiles.includes(file);
  });
}

// 检查文件是否使用 CommonJS
function usesCommonJS(content) {
  const commonjsPatterns = [
    /require\s*\(/,                           // require() 调用
    /module\.exports\s*=/,                    // module.exports
    /exports\.\w+\s*=/,                        // exports.xxx =
    /module\.exports\.\w+\s*=/,                // module.exports.xxx =
  ];
  
  // 更精确地检查是否已经有 ES6 导入/导出（避免误判注释）
  const hasES6Import = /^\s*import\s+.*from\s+['"][^'"]+['"];?\s*$/m.test(content);
  const hasES6Export = /^\s*export\s+/m.test(content);
  
  // 如果已经有 ES6 导入/导出，可能已经部分转换或混合使用
  const hasMixedModules = hasES6Import || hasES6Export;
  
  // 检查是否有 CommonJS 模式（避免误判字符串中的 require）
  const hasCommonJS = commonjsPatterns.some(pattern => pattern.test(content));
  
  return {
    hasCommonJS,
    hasMixedModules,
    needsConversion: hasCommonJS && !hasES6Import && !hasES6Export,
  };
}

// 分析文件
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = usesCommonJS(content);
    
    logger.debug(`文件分析: ${filePath}`);
    logger.debug(`  - 使用 CommonJS: ${result.hasCommonJS}`);
    logger.debug(`  - 混合模块系统: ${result.hasMixedModules}`);
    logger.debug(`  - 需要转换: ${result.needsConversion}`);
    
    return {
      path: filePath,
      ...result,
    };
  } catch (error) {
    logger.error(`分析文件失败 ${filePath}: ${error.message}`);
    return null;
  }
}

// 创建备份
function createBackup(filePath) {
  const backupPath = path.join(CONFIG.backupDir, filePath);
  const backupDir = path.dirname(backupPath);
  
  // 确保备份目录存在
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // 复制文件
  fs.copyFileSync(filePath, backupPath);
  logger.info(`已备份: ${filePath} -> ${backupPath}`);
}

// 转换 require 到 import
function convertRequireToImport(content) {
  // 首先收集所有需要转换的 require 语句
  const importStatements = [];
  const dynamicImports = [];
  
  // 处理 const xxx = require('xxx')
  content = content.replace(
    /const\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\);?/g,
    (match, varName, modulePath) => {
      // 检查是否在函数内部，如果是，可能需要特殊处理
      const isInsideFunction = content.substring(0, content.indexOf(match)).split('{').length >
                             content.substring(0, content.indexOf(match)).split('}').length;
      
      if (isInsideFunction) {
        // 在函数内部，使用动态导入
        dynamicImports.push({ varName, modulePath });
        return match; // 暂时保留原样，稍后处理
      }
      
      importStatements.push(`import ${varName} from "${modulePath}";`);
      return ''; // 移除原来的 require 语句
    }
  );
  
  // 处理 const {xxx} = require('xxx')
  content = content.replace(
    /const\s*\{([^}]+)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\);?/g,
    (match, imports, modulePath) => {
      // 清理导入项
      const cleanImports = imports.split(',').map(item => {
        item = item.trim();
        // 处理别名: {xxx as yyy} -> {yyy as xxx}
        const aliasMatch = item.match(/^(\w+)\s+as\s+(\w+)$/);
        if (aliasMatch) {
          return `${aliasMatch[2]} as ${aliasMatch[1]}`;
        }
        return item;
      }).join(', ');
      
      // 检查是否在函数内部
      const isInsideFunction = content.substring(0, content.indexOf(match)).split('{').length >
                             content.substring(0, content.indexOf(match)).split('}').length;
      
      if (isInsideFunction) {
        // 在函数内部，使用动态导入
        dynamicImports.push({ imports: cleanImports, modulePath, isDestructured: true });
        return match; // 暂时保留原样，稍后处理
      }
      
      importStatements.push(`import { ${cleanImports} } from "${modulePath}";`);
      return ''; // 移除原来的 require 语句
    }
  );
  
  // 处理特殊的 require 调用，如 require('./helpers/packages')()
  content = content.replace(
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)(\s*\(\s*\))?/g,
    (match, modulePath, call) => {
      // 检查是否是 require(...)() 的形式
      if (call) {
        return `(await import("${modulePath}"))${call}`;
      }
      return `(await import("${modulePath}"))`;
    }
  );
  
  // 在文件开头添加所有 import 语句
  if (importStatements.length > 0) {
    // 查找文件开头的位置（跳过注释和 shebang）
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // 跳过 shebang
    if (lines[0] && lines[0].startsWith('#!')) {
      insertIndex = 1;
    }
    
    // 跳过注释块
    while (insertIndex < lines.length &&
           (lines[insertIndex].trim().startsWith('//') ||
            lines[insertIndex].trim().startsWith('/*') ||
            lines[insertIndex].trim() === '')) {
      insertIndex++;
    }
    
    lines.splice(insertIndex, 0, '', ...importStatements, '');
    content = lines.join('\n');
  }
  
  // 处理函数内部的动态导入
  dynamicImports.forEach(({ varName, modulePath, imports, isDestructured }) => {
    if (isDestructured) {
      const dynamicImportPattern = new RegExp(
        `const\\s*\\{[^}]+\\}\\s*=\\s*require\\s*\\(\\s*['"]${modulePath}['"]\\s*\\)`,
        'g'
      );
      content = content.replace(dynamicImportPattern, `const { ${imports} } = await import("${modulePath}")`);
    } else {
      const dynamicImportPattern = new RegExp(
        `const\\s+${varName}\\s*=\\s*require\\s*\\(\\s*['"]${modulePath}['"]\\s*\\)`,
        'g'
      );
      content = content.replace(dynamicImportPattern, `const ${varName} = await import("${modulePath}")`);
    }
  });
  
  return content;
}

// 转换 module.exports 到 export
function convertExports(content) {
  // 收集所有的导出声明
  const namedExports = [];
  
  // 处理 exports.xxx = xxx
  content = content.replace(
    /exports\.(\w+)\s*=\s*([^;]+);?/g,
    (match, exportName, value) => {
      namedExports.push({ name: exportName, value });
      return ''; // 移除原来的导出语句
    }
  );
  
  // 处理 module.exports.xxx = xxx
  content = content.replace(
    /module\.exports\.(\w+)\s*=\s*([^;]+);?/g,
    (match, exportName, value) => {
      namedExports.push({ name: exportName, value });
      return ''; // 移除原来的导出语句
    }
  );
  
  // 处理 module.exports = xxx（默认导出）
  content = content.replace(
    /module\.exports\s*=\s*([^;]+);?/g,
    (match, value) => {
      // 如果值是一个对象字面量，可以尝试分解它
      if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
        try {
          // 尝试解析对象字面量
          const objValue = value.trim().replace(/^\{|\}$/g, '');
          const properties = objValue.split(',').map(prop => prop.trim());
          
          // 简单处理，只处理属性名：值的形式
          const newNamedExports = [];
          properties.forEach(prop => {
            const colonIndex = prop.indexOf(':');
            if (colonIndex > 0) {
              const propName = prop.substring(0, colonIndex).trim();
              const propValue = prop.substring(colonIndex + 1).trim();
              // 移除属性名的引号（如果有）
              const cleanPropName = propName.replace(/^['"]|['"]$/g, '');
              if (cleanPropName && propValue) {
                newNamedExports.push({ name: cleanPropName, value: propValue });
              }
            }
          });
          
          namedExports.push(...newNamedExports);
          return ''; // 移除原来的导出语句
        } catch (e) {
          // 如果解析失败，保持原样
          return `export default ${value};`;
        }
      }
      
      return `export default ${value};`;
    }
  );
  
  // 在文件末尾添加所有命名导出
  if (namedExports.length > 0) {
    const exportStatements = namedExports.map(
      ({ name, value }) => `export const ${name} = ${value};`
    );
    content += '\n\n' + exportStatements.join('\n');
  }
  
  return content;
}

// 处理文件
function processFile(filePath) {
  logger.info(`处理文件: ${filePath}`);
  
  try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 分析文件
    const analysis = analyzeFile(filePath);
    if (!analysis) {
      return false;
    }
    
    // 如果不需要转换，跳过
    if (!analysis.needsConversion) {
      logger.info(`跳过文件（不需要转换）: ${filePath}`);
      return true;
    }
    
    // 创建备份
    createBackup(filePath);
    
    // 转换 require 到 import
    content = convertRequireToImport(content);
    
    // 转换 exports
    content = convertExports(content);
    
    // 检查是否有变化
    if (content === originalContent) {
      logger.info(`文件内容无变化: ${filePath}`);
      return true;
    }
    
    // 写入转换后的内容
    fs.writeFileSync(filePath, content);
    logger.info(`已转换: ${filePath}`);
    
    return true;
  } catch (error) {
    logger.error(`处理文件失败 ${filePath}: ${error.message}`);
    return false;
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
ES6 模块转换脚本

用法:
  node scripts/convert-to-es-modules.js [选项]

选项:
  --execute        实际执行转换（默认只分析不转换）
  --verbose        显示详细日志
  --help           显示帮助信息

示例:
  node scripts/convert-to-es-modules.js              # 只分析，不转换
  node scripts/convert-to-es-modules.js --execute   # 分析并转换
  node scripts/convert-to-es-modules.js --verbose    # 显示详细日志

注意:
  - 默认情况下，脚本只进行分析，不会修改任何文件
  - 使用 --execute 选项才会实际执行转换
  - 转换前会自动创建备份
  - 已转换的文件（如 scripts/start.js）会被自动跳过
`);
}

// 主函数
function main() {
  // 检查是否需要显示帮助
  if (args.help) {
    showHelp();
    return;
  }
  
  console.log('开始分析 scripts/ 目录中的 CommonJS 文件...\n');
  console.log(`执行模式: ${CONFIG.execute ? '实际转换' : '仅分析（使用 --execute 执行实际转换）'}`);
  console.log(`日志级别: ${CONFIG.logLevel}\n`);
  
  // 获取所有 JS 文件
  const allFiles = getAllJsFiles();
  logger.info(`找到 ${allFiles.length} 个 JS 文件\n`);
  
  // 分析所有文件
  const analysisResults = allFiles.map(analyzeFile).filter(Boolean);
  
  // 分类文件
  const needsConversion = analysisResults.filter(r => r.needsConversion);
  const hasMixedModules = analysisResults.filter(r => r.hasMixedModules);
  const noCommonJS = analysisResults.filter(r => !r.hasCommonJS);
  
  // 输出分析结果
  console.log('=== 分析结果 ===');
  console.log(`总文件数: ${analysisResults.length}`);
  console.log(`需要转换的文件: ${needsConversion.length}`);
  console.log(`混合使用模块系统的文件: ${hasMixedModules.length}`);
  console.log(`不使用 CommonJS 的文件: ${noCommonJS.length}\n`);
  
  // 详细列出需要转换的文件
  if (needsConversion.length > 0) {
    console.log('=== 需要转换的文件 ===');
    needsConversion.forEach(file => {
      console.log(`- ${file.path}`);
    });
    console.log();
  }
  
  // 详细列出混合使用模块系统的文件
  if (hasMixedModules.length > 0) {
    console.log('=== 混合使用模块系统的文件（需要手动检查）===');
    hasMixedModules.forEach(file => {
      console.log(`- ${file.path}`);
    });
    console.log();
  }
  
  // 如果需要执行转换
  if (CONFIG.execute && needsConversion.length > 0) {
    console.log(`开始执行转换...（备份目录: ${CONFIG.backupDir}）\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 逐个处理文件
    for (const file of needsConversion) {
      if (processFile(file.path)) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\n=== 转换结果 ===');
    console.log(`成功转换: ${successCount} 个文件`);
    console.log(`转换失败: ${failCount} 个文件`);
    
    if (successCount > 0) {
      console.log('\n注意: 转换后的文件可能需要手动调整，请检查转换结果！');
    }
  } else if (needsConversion.length === 0) {
    console.log('没有需要转换的文件。');
  } else if (!CONFIG.execute) {
    console.log('提示: 使用 --execute 选项执行实际转换。');
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}

// 导出函数供其他脚本使用
module.exports = {
  getAllJsFiles,
  analyzeFile,
  processFile,
  convertRequireToImport,
  convertExports,
  main,
  showHelp,
};