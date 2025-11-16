




// 配置

import fs from "fs";
import path from "path";
import glob from "glob";
import fse from "fs-extra";

const CONFIG = {
  // 需要处理的文件模式
  filePatterns: [
    'packages/**/*.js',
    'packages/**/*.jsx',
    'packages/**/*.ts',
    'packages/**/*.tsx',
    'scripts/**/*.js'
  ],
  // 备份目录
  backupDir: './backup-lodash-replacement',
  // 报告文件
  reportFile: './lodash-replacement-report.json'
};

// 报告数据
const report = {
  startTime: new Date().toISOString(),
  endTime: null,
  totalFilesProcessed: 0,
  totalFilesModified: 0,
  totalPackageJsonModified: 0,
  filesModified: [],
  packageJsonModified: [],
  errors: []
};

// 独立 lodash 函数包映射
const LODOASH_FUNCTION_PACKAGES = {
  'lodash.assign': 'assign',
  'lodash.clonedeepwith': 'cloneDeepWith',
  'lodash.clone': 'clone',
  'lodash.debounce': 'debounce',
  'lodash.defaults': 'defaults',
  'lodash.find': 'find',
  'lodash.filter': 'filter',
  'lodash.foreach': 'forEach',
  'lodash.get': 'get',
  'lodash.isempty': 'isEmpty',
  'lodash.isequal': 'isEqual',
  'lodash.merge': 'merge',
  'lodash.omit': 'omit',
  'lodash.pull': 'pull',
  'lodash.pullallwith': 'pullAllWith',
  'lodash.throttle': 'throttle',
  'lodash.uniq': 'uniq',
  'lodash.uniqwith': 'uniqWith',
  'lodash.uniqueid': 'uniqueId',
  'lodash.clonedeep': 'cloneDeep',
  'lodash.map': 'map',
  'lodash.mapkeys': 'mapKeys',
  'lodash.difference': 'difference',
  'lodash.flatten': 'flatten',
  'lodash.keyby': 'keyBy',
  'lodash.matches': 'matches'
};

// 创建备份
function createBackup(filePath) {
  try {
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(CONFIG.backupDir, relativePath);
    
    // 确保备份目录存在
    fse.ensureDirSync(path.dirname(backupPath));
    
    // 复制文件到备份目录
    fse.copySync(filePath, backupPath);
    
    return true;
  } catch (error) {
    console.error(`创建备份失败 ${filePath}:`, error.message);
    report.errors.push({
      type: 'backup_error',
      file: filePath,
      error: error.message
    });
    return false;
  }
}

// 替换文件中的 lodash 引用
function replaceLodashReferences(content) {
  let modifiedContent = content;
  let hasChanges = false;
  
  // 1. 替换 import * as lodash from 'lodash-es' → import * as lodash from 'lodash-es'
  if (/import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]lodash['"]/g,
      "import * as $1 from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 2. 替换 import _ from 'lodash-es' → import _ from 'lodash-es'
  if (/import\s+\w+\s+from\s+['"]lodash['"]/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /import\s+(\w+)\s+from\s+['"]lodash['"]/g,
      "import $1 from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 3. 替换 import * as _ from 'lodash-es' → import * as _ from 'lodash-es'
  if (/import\s+\*\s+as\s+_\s+from\s+['"]lodash['"]/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /import\s+\*\s+as\s+_\s+from\s+['"]lodash['"]/g,
      "import * as _ from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 4. 替换 import { functionName } from 'lodash-es' → import { functionName } from 'lodash-es'
  if (/import\s+\{[^}]+\}\s+from\s+['"]lodash['"]/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /import\s+(\{[^}]+\})\s+from\s+['"]lodash['"]/g,
      "import $1 from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 5. 替换 import _ from 'lodash-es' → import _ from 'lodash-es'
  if (/const\s+_?\s*=\s*require\(['"]lodash['"]\)/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /const\s+(_?)\s*=\s*require\(['"]lodash['"]\)/g,
      (match, varName) => {
        if (varName) {
          return `import ${varName} from 'lodash-es'`;
        }
        return "import _ from 'lodash-es'";
      }
    );
    hasChanges = true;
  }
  
  // 6. 替换 import * as lodash from 'lodash-es' → import * as lodash from 'lodash-es'
  if (/const\s+lodash\s*=\s*require\(['"]lodash['"]\)/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /const\s+lodash\s*=\s*require\(['"]lodash['"]\)/g,
      "import * as lodash from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 7. 替换 import { functionName } from 'lodash-es' → import { functionName } from 'lodash-es'
  if (/const\s+\{[^}]+\}\s*=\s*require\(['"]lodash['"]\)/.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(
      /const\s+(\{[^}]+\})\s*=\s*require\(['"]lodash['"]\)/g,
      "import $1 from 'lodash-es'"
    );
    hasChanges = true;
  }
  
  // 8. 替换 (await import("lodash.functionName")) → import { functionName } from 'lodash-es'
  Object.keys(LODOASH_FUNCTION_PACKAGES).forEach(packageName => {
    const functionName = LODOASH_FUNCTION_PACKAGES[packageName];
    const regex = new RegExp(`require\\(['"]${packageName}['"]\\)`, 'g');
    
    if (regex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(
        regex,
        `import { ${functionName} } from 'lodash-es'`
      );
      hasChanges = true;
    }
  });
  
  // 9. 替换 lodash.methodName 的引用（用于处理 lodash.* 的引用）
  modifiedContent = modifiedContent.replace(
    /lodash\.(\w+)/g,
    (match, methodName) => {
      // 检查是否是独立包中的方法
      const packageName = `lodash.${methodName.toLowerCase()}`;
      if (LODOASH_FUNCTION_PACKAGES[packageName]) {
        return `lodash.${methodName}`; // 保持不变，因为我们已经导入了
      }
      return `lodash.${methodName}`; // 保持不变
    }
  );
  
  return {
    content: modifiedContent,
    hasChanges
  };
}

// 更新 package.json 中的依赖
function updatePackageDependencies(packageJsonPath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let hasChanges = false;
    const changes = {
      added: [],
      removed: [],
      updated: []
    };
    
    // 处理 lodash 依赖
    if (packageJson.dependencies && packageJson.dependencies.lodash) {
      delete packageJson.dependencies.lodash;
      packageJson.dependencies['lodash-es'] = '^4.17.21';
      changes.updated.push('lodash → lodash-es');
      hasChanges = true;
    }
    
    // 删除独立的 lodash 函数包依赖
    Object.keys(LODOASH_FUNCTION_PACKAGES).forEach(packageName => {
      if (packageJson.dependencies && packageJson.dependencies[packageName]) {
        delete packageJson.dependencies[packageName];
        changes.removed.push(packageName);
        hasChanges = true;
      }
    });
    
    // 添加 @types/lodash-es 如果存在 @types/lodash
    if (packageJson.devDependencies && packageJson.devDependencies['@types/lodash']) {
      if (!packageJson.devDependencies['@types/lodash-es']) {
        packageJson.devDependencies['@types/lodash-es'] = '^4.17.12';
        changes.added.push('@types/lodash-es');
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      return changes;
    }
    
    return null;
  } catch (error) {
    console.error(`更新 package.json 失败 ${packageJsonPath}:`, error.message);
    report.errors.push({
      type: 'package_json_error',
      file: packageJsonPath,
      error: error.message
    });
    return null;
  }
}

// 处理单个文件
function processFile(filePath) {
  try {
    report.totalFilesProcessed++;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const result = replaceLodashReferences(content);
    
    if (result.hasChanges) {
      // 创建备份
      if (!createBackup(filePath)) {
        return false;
      }
      
      // 写入修改后的内容
      fs.writeFileSync(filePath, result.content);
      
      report.totalFilesModified++;
      report.filesModified.push(filePath);
      console.log(`已处理: ${filePath}`);
    }
    
    return true;
  } catch (error) {
    console.error(`处理文件失败 ${filePath}:`, error.message);
    report.errors.push({
      type: 'file_processing_error',
      file: filePath,
      error: error.message
    });
    return false;
  }
}

// 查找并处理所有 package.json 文件
function processAllPackageJsonFiles() {
  const packageJsonFiles = glob.sync('packages/**/package.json');
  
  packageJsonFiles.forEach(packageJsonPath => {
    const changes = updatePackageDependencies(packageJsonPath);
    
    if (changes) {
      // 创建备份
      if (createBackup(packageJsonPath)) {
        report.totalPackageJsonModified++;
        report.packageJsonModified.push({
          file: packageJsonPath,
          changes
        });
        console.log(`已更新依赖: ${packageJsonPath}`);
      }
    }
  });
  
  // 处理根目录的 package.json
  const rootPackageJsonPath = './package.json';
  const rootChanges = updatePackageDependencies(rootPackageJsonPath);
  
  if (rootChanges) {
    if (createBackup(rootPackageJsonPath)) {
      report.totalPackageJsonModified++;
      report.packageJsonModified.push({
        file: rootPackageJsonPath,
        changes: rootChanges
      });
      console.log(`已更新依赖: ${rootPackageJsonPath}`);
    }
  }
}

// 主函数
function main() {
  console.log('开始替换 lodash 为 lodash-es...');
  
  // 创建备份目录
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  
  // 处理所有源文件
  CONFIG.filePatterns.forEach(pattern => {
    const files = glob.sync(pattern);
    
    files.forEach(file => {
      // 跳过 node_modules 和备份目录
      if (file.includes('node_modules') || file.includes(CONFIG.backupDir)) {
        return;
      }
      
      processFile(file);
    });
  });
  
  // 处理 package.json 文件
  processAllPackageJsonFiles();
  
  // 完成报告
  report.endTime = new Date().toISOString();
  
  // 保存报告
  fs.writeFileSync(CONFIG.reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n处理完成!`);
  console.log(`总文件数: ${report.totalFilesProcessed}`);
  console.log(`修改的文件数: ${report.totalFilesModified}`);
  console.log(`修改的 package.json 文件数: ${report.totalPackageJsonModified}`);
  console.log(`错误数: ${report.errors.length}`);
  console.log(`备份目录: ${CONFIG.backupDir}`);
  console.log(`报告文件: ${CONFIG.reportFile}`);
  
  if (report.errors.length > 0) {
    console.log('\n错误详情:');
    report.errors.forEach(error => {
      console.log(`- ${error.type}: ${error.file} - ${error.error}`);
    });
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  main();
}

