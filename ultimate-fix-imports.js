#!/usr/bin/env node

/**
 * Ultimate script to fix ALL remaining ES module imports that need .js extensions
 */

import fs from 'fs';
import path from 'path';

// Get all TypeScript and JavaScript files that might contain imports
function getAllFiles(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs']) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'lib') {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

// Fix import statements in a file
function fixAllImportsInFile(filePath) {
  console.log(`Checking: ${filePath}`);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return false;
  }

  const originalContent = content;
  let hasChanges = false;

  // Comprehensive regex to match ANY import from @haiku/* or haiku-* packages
  // that doesn't already end with .js
  const importRegex = /from ['"]((@haiku|haiku)-[^'"]*)['"]/g;

  content = content.replace(importRegex, (match, importPath) => {
    // Skip if already has .js extension
    if (importPath.endsWith('.js')) {
      return match;
    }

    // Skip if it's a node_modules external dependency
    // (but we know all @haiku/* and haiku-* packages are internal)

    console.log(`  -> Fixing: ${importPath} -> ${importPath}.js`);
    hasChanges = true;
    return match.replace(importPath, importPath + '.js');
  });

  // Write back if changed
  if (content !== originalContent) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed imports in: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error.message);
      return false;
    }
  }

  return false;
}

// Main execution
function main() {
  console.log('🔧 ULTIMATE FIX - All ES module imports that need .js extensions...\n');

  const rootDir = process.cwd();
  const packagesDir = path.join(rootDir, 'packages');

  let totalFiles = 0;
  let fixedFiles = 0;

  // Get all files in packages directory
  const allFiles = getAllFiles(packagesDir);

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Check if file has any @haiku/* or haiku-* imports that don't end with .js
      if (/from ['"]((@haiku|haiku)-[^'"]*)(?<!\.js)['"]/.test(content)) {
        console.log(`Found file with imports needing fixes: ${file}`);
        totalFiles++;
        if (fixAllImportsInFile(file)) {
          fixedFiles++;
        }
      }
    } catch (error) {
      console.error(`Error checking file ${file}:`, error.message);
    }
  }

  console.log(`\n✅ Summary:`);
  console.log(`   Total files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedFiles}`);
  console.log(`   Files unchanged: ${totalFiles - fixedFiles}`);

  if (fixedFiles > 0) {
    console.log('\n🎉 Ultimate import fixing completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: pnpm compile-all');
    console.log('   2. Run: pnpm test-all');
    console.log('   3. Test the application with: pnpm start');
  } else {
    console.log('\n✨ No more imports needed fixing!');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
