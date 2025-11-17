#!/usr/bin/env node

/**
 * Final script to fix all remaining ES module imports
 */

import fs from 'fs';
import path from 'path';

// List of files to fix based on the remaining issues
const filesToFix = [
  'packages/haiku-sdk-creator/src/dal/Carbonite.ts',
  'packages/haiku-sdk-creator/src/dal/Registry.ts',
  'packages/haiku-sdk-creator/src/bll/Project.ts',
  'packages/haiku-admin-cli/src/admin-cli.ts',
  'packages/haiku-ui-common/src/helpers/uiColorHelpers.ts',
  'packages/haiku-creator/src/react/components/ProjectPreview.js',
  'packages/haiku-creator/src/react/components/ProjectBrowser.js',
  'packages/haiku-creator/src/react/components/Toggle.js',
  'packages/haiku-creator/src/react/components/Popups/FailWhale.tsx',
  'packages/haiku-creator/src/react/components/EventHandlerEditor/HandlerManager.js',
  'packages/haiku-sdk-creator/test/bll/User.test.ts',
  'packages/@haiku/sdk-client/test/index.test.ts',
  'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/AngularHaiku.tsx',
  'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/VueHaiku.tsx',
  'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/VanillaJS.tsx',
  'packages/haiku-ui-common/src/react/ShareModal/ShareOptions/ReactHaiku.tsx',
  'packages/haiku-common/src/layout/composedTransformsToTimelineProperties.ts',
  'packages/haiku-common/src/layout/convertManaLayout.ts',
  'packages/haiku-common/src/layout/parseCssTransformString.ts',
  'packages/haiku-common/src/sustained-checker/SustainedWarningChecker.ts',
  'packages/haiku-formats/src/exporters/layout.ts',
  'packages/haiku-formats/test/exporters/bodymovin.test.ts',
  'packages/haiku-formats/test/exporters/curves.test.ts',
  'packages/haiku-formats/src/exporters/bodymovin/bodymovinUtils.ts',
  'packages/haiku-formats/src/exporters/bodymovin/bodymovinExporter.ts',
  'packages/haiku-formats/src/exporters/injectables.ts',
  'packages/haiku-glass/src/react/Preview.jsx',
  'packages/haiku-formats/src/exporters/timelineUtils.ts',
  'packages/haiku-formats/src/exporters/BaseExporter.ts',
  'packages/haiku-formats/src/exporters/haikuStatic/haikuStaticExporter.ts',
  'packages/haiku-formats/src/exporters/curves.ts',
  'packages/haiku-glass/src/react/Glass.jsx',
  'packages/haiku-glass/src/overlays/directSelectionMana.js'
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return false;
  }

  console.log(`Fixing: ${filePath}`);

  let content;
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${fullPath}:`, error.message);
    return false;
  }

  const originalContent = content;

  // Fix all @haiku/* and haiku-* imports that need .js
  content = content.replace(
    /from ['"]((@haiku|haiku)-[^'"]*)(?<!\.js)['"]/g,
    (match, importPath) => {
      // Skip if it already has .js
      if (importPath.endsWith('.js')) {
        return match;
      }
      // Add .js to package-level imports and path-based imports
      console.log(`  -> ${importPath} -> ${importPath}.js`);
      return match.replace(importPath, importPath + '.js');
    }
  );

  // Write back if changed
  if (content !== originalContent) {
    try {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Error writing file ${fullPath}:`, error.message);
      return false;
    }
  } else {
    console.log(`- No changes needed: ${filePath}`);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔧 Final fix for all remaining ES module imports...\n');

  let fixedCount = 0;
  let totalCount = 0;

  for (const file of filesToFix) {
    totalCount++;
    if (fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n✅ Summary:`);
  console.log(`   Total files processed: ${totalCount}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Files unchanged: ${totalCount - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n🎉 Final import fixing completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: pnpm compile-all');
    console.log('   2. Run: pnpm test-all');
    console.log('   3. Test the application with: pnpm start');
  } else {
    console.log('\n✨ No additional imports needed fixing!');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
