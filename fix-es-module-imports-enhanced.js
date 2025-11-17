#!/usr/bin/env node

/**
 * Enhanced script to fix ES module imports by adding .js extensions
 * This version handles more edge cases and patterns
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

  // Enhanced regex to match more import patterns
  const patterns = [
    // Match imports from @haiku/* or haiku-* packages that don't end with .js and have a path
    {
      regex: /from ['"]((@haiku|haiku)-[^'"]*\/[^'"]*)(?<!\.js)['"]/g,
      replacement: (match, importPath) => {
        return match.replace(importPath, importPath + '.js');
      }
    },
    // Match imports that are just package names without paths (these should NOT get .js)
    // These are external dependencies and should stay as-is
    {
      regex: /from ['"](@haiku|haiku)-[a-zA-Z0-9\-]+['"](?!\.[a-z])\s*(?=[;,)])/g,
      // This pattern should NOT be replaced - these are package imports
      replacement: (match) => {
        return match; // No change for package-level imports
      }
    }
  ];

  // Apply a more comprehensive regex for the main case
  const mainRegex = /from ['"]((@haiku|haiku)-[^'"]*\/[^'"]*?)(?<!\.js)['"]/g;

  content = content.replace(mainRegex, (match, importPath) => {
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
  console.log('🔧 Fixing ES module imports in Haiku Animator codebase (Enhanced)...\n');

  const rootDir = process.cwd();
  const packagesDir = path.join(rootDir, 'packages');

  let totalFiles = 0;
  let fixedFiles = 0;

  // Target specific files that still need fixing
  const targetFiles = [
    'packages/@haiku/cli/src/haiku-cli.ts',
    'packages/@haiku/sdk-client/src/index.ts',
    'packages/@haiku/sdk-client/test/index.test.ts',
    'packages/haiku-ui-common/src/helpers/uiColorHelpers.ts',
    'packages/haiku-sdk-creator/test/bll/User.test.ts',
    'packages/haiku-sdk-creator/src/dal/Carbonite.ts',
    'packages/haiku-sdk-creator/src/dal/Registry.ts',
    'packages/haiku-plumbing/test/TestHelpers.js',
    'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/AngularHaiku.tsx',
    'packages/haiku-plumbing/test/fuzz/01_fuzz.test.js',
    'packages/haiku-plumbing/test/fuzz/02_fuzz.test.js',
    'packages/haiku-creator/src/react/components/ProjectPreview.js',
    'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/VueHaiku.tsx',
    'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/VanillaJS.tsx',
    'packages/haiku-sdk-creator/src/bll/User.ts',
    'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/ReactHaiku.tsx',
    'packages/haiku-sdk-creator/src/bll/Project.ts',
    'packages/haiku-admin-cli/src/admin-cli.ts',
    'packages/haiku-creator/src/react/components/Toggle.js',
    'packages/haiku-creator/src/react/components/Popups/FailWhale.tsx',
    'packages/haiku-plumbing/test/plumbing/01_Watcher.test.js',
    'packages/haiku-plumbing/test/plumbing/02_ProjectFolder.fixProjectName.test.js',
    'packages/haiku-creator/src/react/components/EventHandlerEditor/HandlerManager.js',
    'packages/haiku-plumbing/test/git/git1.js',
    'packages/haiku-plumbing/test/git/02_status.test.stub.js',
    'packages/haiku-plumbing/test/git/00_allTags.test.js',
    'packages/haiku-creator/src/react/components/ProjectBrowser.js',
    'packages/haiku-plumbing/src/project-folder/getResourcesPath.ts',
    'packages/haiku-plumbing/src/project-folder/AssetUtils.ts',
    'packages/haiku-plumbing/src/Master.js',
    'packages/haiku-plumbing/src/ProjectFile.js',
    'packages/haiku-plumbing/src/GitAdapter.ts',
    'packages/haiku-plumbing/src/MasterGitProject.js',
    'packages/haiku-plumbing/src/Raven.js',
    'packages/haiku-plumbing/src/Git.js',
    'packages/haiku-common/src/layout/composedTransformsToTimelineProperties.ts',
    'packages/haiku-common/src/layout/convertManaLayout.ts',
    'packages/haiku-common/src/layout/parseCssTransformString.ts',
    'packages/haiku-common/src/sustained-checker/SustainedWarningChecker.ts',
    'packages/haiku-formats/scripts/upgrade-goldens.ts',
    'packages/haiku-formats/test/exporters/bodymovin.test.ts',
    'packages/haiku-formats/src/exporters/curves.ts',
    'packages/haiku-formats/src/exporters/layout.ts',
    'packages/haiku-formats/src/exporters/injectables.ts',
    'packages/haiku-formats/test/exporters/curves.test.ts',
    'packages/haiku-glass/src/react/Preview.jsx',
    'packages/haiku-formats/src/exporters/bodymovin/bodymovinUtils.ts',
    'packages/haiku-formats/src/exporters/haikuStatic/haikuStaticExporter.ts',
    'packages/haiku-formats/src/exporters/bodymovin/bodymovinExporter.ts',
    'packages/haiku-formats/src/exporters/timelineUtils.ts',
    'packages/haiku-formats/src/exporters/BaseExporter.ts',
    'packages/haiku-glass/src/react/Glass.jsx',
    'packages/haiku-glass/src/overlays/directSelectionMana.js'
  ];

  for (const file of targetFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      totalFiles++;
      if (fixImportsInFile(fullPath)) {
        fixedFiles++;
      }
    } else {
      console.log(`File not found: ${fullPath}`);
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
