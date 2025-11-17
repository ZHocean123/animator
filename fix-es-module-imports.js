#!/usr/bin/env node

/**
 * Script to fix ES module imports by adding .js extensions
 * This script finds all import statements that reference haiku-* or @haiku/* packages
 * without .js extensions and adds them automatically.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get all TypeScript and JavaScript files that might contain imports
function getAllFiles(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs']) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

// Fix import statements in a file
function fixImportsInFile(filePath) {
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

  // Patterns to match imports without .js extensions
  const patterns = [
    // Single line imports
    // from 'haiku-package' or from '@haiku/package'
    {
      regex: /from ['"]((@haiku|haiku)-[^'"]+)['"]/g,
      replacement: (match, importPath) => {
        // Skip if already has .js extension
        if (importPath.endsWith('.js')) {
          return match;
        }
        // Skip if it's just a package name (no path)
        if (!importPath.includes('/')) {
          return match;
        }
        return match.replace(importPath, importPath + '.js');
      }
    },
    // Multi-line imports with braces
    {
      regex: /from ['"]((@haiku|haiku)-[^'"]+)['"]/g,
      replacement: (match, importPath) => {
        // Skip if already has .js extension
        if (importPath.endsWith('.js')) {
          return match;
        }
        // Skip if it's just a package name (no path)
        if (!importPath.includes('/')) {
          return match;
        }
        return match.replace(importPath, importPath + '.js');
      }
    }
  ];

  // Apply all patterns
  for (const pattern of patterns) {
    content = content.replace(pattern.regex, pattern.replacement);
  }

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
  console.log('🔧 Fixing ES module imports in Haiku Animator codebase...\n');

  const rootDir = process.cwd();
  const packagesDir = path.join(rootDir, 'packages');

  let totalFiles = 0;
  let fixedFiles = 0;

  // Process packages directory
  if (fs.existsSync(packagesDir)) {
    const packageDirs = fs.readdirSync(packagesDir)
      .filter(dir => fs.statSync(path.join(packagesDir, dir)).isDirectory());

    for (const packageDir of packageDirs) {
      const packagePath = path.join(packagesDir, packageDir);
      console.log(`\n📦 Processing package: ${packageDir}`);

      const files = getAllFiles(packagePath);
      totalFiles += files.length;

      for (const file of files) {
        if (fixImportsInFile(file)) {
          fixedFiles++;
        }
      }
    }
  }

  // Also check root-level files
  const rootFiles = getAllFiles(rootDir);
  totalFiles += rootFiles.length;

  console.log('\n📁 Processing root directory...');
  for (const file of rootFiles) {
    if (fixImportsInFile(file)) {
      fixedFiles++;
    }
  }

  console.log(`\n✅ Summary:`);
  console.log(`   Total files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedFiles}`);
  console.log(`   Files unchanged: ${totalFiles - fixedFiles}`);

  if (fixedFiles > 0) {
    console.log('\n🎉 Import fixing completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: pnpm compile-all');
    console.log('   2. Run: pnpm test-all');
    console.log('   3. Test the application with: pnpm start');
  } else {
    console.log('\n✨ No imports needed fixing!');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as fixImports };
