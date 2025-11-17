#!/usr/bin/env node

/**
 * Script to fix package-level ES module imports by adding .js extensions
 * This specifically handles imports like "@haiku/sdk-client" -> "@haiku/sdk-client.js"
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

// Fix package-level import statements in a file
function fixPackageImportsInFile(filePath) {
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

  // Match package-level imports (without paths) that need .js extension
  // This matches: from '@haiku/package' or from 'haiku-package'
  // But NOT: from '@haiku/package/something' or from 'haiku-package/something'
  const packageImportRegex = /from ['"]((@haiku|haiku)-[a-zA-Z0-9\-]+)['"](?![\/.])(?=[;,])/g;

  content = content.replace(packageImportRegex, (match, packageName) => {
    console.log(`  -> Fixing package import: ${packageName} -> ${packageName}.js`);
    hasChanges = true;
    return match.replace(packageName, packageName + '.js');
  });

  // Write back if changed
  if (content !== originalContent) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed package imports in: ${filePath}`);
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
  console.log('🔧 Fixing package-level ES module imports in Haiku Animator codebase...\n');

  const rootDir = process.cwd();
  const packagesDir = path.join(rootDir, 'packages');

  let totalFiles = 0;
  let fixedFiles = 0;

  // Search for all files with package-level imports that need fixing
  console.log('🔍 Finding files with package-level imports that need .js extensions...');

  const allFiles = getAllFiles(packagesDir);

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Check if file has package-level imports without .js extension
      if (/from ['"]((@haiku|haiku)-[a-zA-Z0-9\-]+)['"](?![\/.])(?=[;,])/.test(content)) {
        console.log(`Found file needing fixes: ${file}`);
        totalFiles++;
        if (fixPackageImportsInFile(file)) {
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
    console.log('\n🎉 Package-level import fixing completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: pnpm compile-all');
    console.log('   2. Run: pnpm test-all');
    console.log('   3. Test the application with: pnpm start');
  } else {
    console.log('\n✨ No package-level imports needed fixing!');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as fixPackageImports };
