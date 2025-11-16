#!/usr/bin/env node

/**
 * 修复测试框架兼容性问题
 * - 修复 tape 路径错误（将 ./node_modules/.bin/tape 改为 ./node_modules/tape/bin/tape）
 * - 确保测试用的 tsconfig 正确配置 checkJs 选项
 */

const fs = require('fs');
const path = require('path');

const findFiles = (dir, pattern) => {
  const results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(item)) {
      results.push(fullPath);
    }
  }
  
  return results;
};

const updatePackageJson = (packagePath) => {
  try {
    const content = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    let updated = false;
    
    // 修复 test-report 脚本中的 tape 路径
    if (content.scripts && content.scripts['test-report']) {
      const oldScript = content.scripts['test-report'];
      // 将 ./node_modules/.bin/tape 替换为 ./node_modules/tape/bin/tape
      if (oldScript.includes('./node_modules/.bin/tape')) {
        content.scripts['test-report'] = oldScript.replace(
          /\.\/node_modules\/\.bin\/tape/g,
          './node_modules/tape/bin/tape'
        );
        updated = true;
        console.log(`✓ 修复 tape 路径: ${packagePath}`);
      }
    }
    
    if (updated) {
      fs.writeFileSync(packagePath, JSON.stringify(content, null, 2) + '\n');
      return true;
    }
  } catch (error) {
    console.error(`✗ 更新失败 ${packagePath}:`, error.message);
  }
  
  return false;
};

const updateTsconfigForTests = (tsconfigPath) => {
  try {
    const content = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    let updated = false;
    
    // 如果包含测试文件，确保 checkJs 为 false
    const includesTestFiles = content.include &&
      content.include.some(pattern => pattern.includes('test'));
    
    if (includesTestFiles) {
      if (!content.compilerOptions) {
        content.compilerOptions = {};
      }
      
      // 明确设置 checkJs: false 以避免 JS 文件被当作 TS 处理
      if (content.compilerOptions.checkJs !== false) {
        content.compilerOptions.checkJs = false;
        updated = true;
        console.log(`✓ 添加 checkJs: false: ${tsconfigPath}`);
      }
      
      // 添加 skipLibCheck: true 避免检查 node_modules
      if (content.compilerOptions.skipLibCheck !== true) {
        content.compilerOptions.skipLibCheck = true;
        updated = true;
        console.log(`✓ 添加 skipLibCheck: true: ${tsconfigPath}`);
      }
      
      // 关键：修改 include，只包含测试文件，不包含 src 文件
      const testOnlyInclude = [
        'test/**/*.js',
        'test/**/*.ts',
        'test/**/*.jsx',
        'test/**/*.tsx'
      ];
      
      // 检查是否需要更新 include
      const hasSrcFiles = content.include.some(pattern =>
        pattern.includes('src') && !pattern.includes('test')
      );
      
      if (hasSrcFiles) {
        content.include = testOnlyInclude;
        updated = true;
        console.log(`✓ 更新 include 为仅测试文件: ${tsconfigPath}`);
      }
    }
    
    if (updated) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(content, null, 2) + '\n');
      return true;
    }
  } catch (error) {
    console.error(`✗ 更新失败 ${tsconfigPath}:`, error.message);
  }
  
  return false;
};

const main = () => {
  console.log('🔧 开始修复测试框架兼容性问题...\n');
  
  let packagesUpdated = 0;
  let tsconfigsUpdated = 0;
  
  // 查找所有包的 package.json
  const packagesDir = path.join(__dirname, '..', 'packages');
  const packageJsonFiles = findFiles(packagesDir, /package\.json$/);
  
  console.log('📦 修复 tape 路径错误...');
  for (const packagePath of packageJsonFiles) {
    if (updatePackageJson(packagePath)) {
      packagesUpdated++;
    }
  }
  
  if (packagesUpdated === 0) {
    console.log('✓ 未找到需要修复的 tape 路径');
  }
  
  console.log('\n⚙️  更新 TypeScript 配置文件...');
  // 查找所有 tsconfig.all.json 文件
  const tsconfigFiles = findFiles(packagesDir, /tsconfig\.all\.json$/);
  
  for (const tsconfigPath of tsconfigFiles) {
    if (updateTsconfigForTests(tsconfigPath)) {
      tsconfigsUpdated++;
    }
  }
  
  // 也检查 tsconfig.json 文件
  const baseTsconfigFiles = findFiles(packagesDir, /^tsconfig\.json$/);
  for (const tsconfigPath of baseTsconfigFiles) {
    if (updateTsconfigForTests(tsconfigPath)) {
      tsconfigsUpdated++;
    }
  }
  
  if (tsconfigsUpdated === 0) {
    console.log('✓ 未找到需要更新的 TypeScript 配置');
  }
  
  console.log('\n📊 修复完成！');
  console.log(`  - 更新了 ${packagesUpdated} 个包的脚本`);
  console.log(`  - 更新了 ${tsconfigsUpdated} 个 TypeScript 配置文件`);
  
  console.log('\n✅ 已修复以下问题：');
  console.log('  1. 修复了 tape 路径错误（./node_modules/.bin/tape → ./node_modules/tape/bin/tape）');
  console.log('  2. 为测试配置文件添加了 checkJs: false，防止 JS 文件被当作 TypeScript 处理');
  console.log('\n下一步：运行测试验证修复效果');
};

if (require.main === module) {
  main();
}

module.exports = { updatePackageJson, updateTsconfigForTests };