#!/usr/bin/env node

/**

import fs from "fs";
import path from "path";

 * Fix CSSProperties type errors in TypeScript files
 * 
 * This script fixes the common TypeScript error where React.CSSProperties is used
 * for objects containing nested style definitions, which is incompatible.
 * 
 * Before: const STYLES: React.CSSProperties = { wrapper: { ... } };
 * After:  const STYLES = { wrapper: { ... } };
 * 
 * Files processed:
 * - PublicPrivateOptInModal.tsx
 * - Popups/FailWhale.tsx
 * - library/importers/FigmaForm.tsx
 * - library/DesignFileCreator.tsx
 * - library/FileImporter.tsx
 * - library/importers/FigmaImporter.tsx
 */




const TARGET_FILES = [
  'packages/haiku-creator/src/react/components/PublicPrivateOptInModal.tsx',
  'packages/haiku-creator/src/react/components/Popups/FailWhale.tsx',
  'packages/haiku-creator/src/react/components/library/importers/FigmaForm.tsx',
  'packages/haiku-creator/src/react/components/library/DesignFileCreator.tsx',
  'packages/haiku-creator/src/react/components/library/FileImporter.tsx',
  'packages/haiku-creator/src/react/components/library/importers/FigmaImporter.tsx',
];

const PATTERN = /const STYLES: React\.CSSProperties = \{/g;
const REPLACEMENT = 'const STYLES = {';

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  const fixedContent = content.replace(PATTERN, REPLACEMENT);
  const changes = (fixedContent.match(/const STYLES = \{/g) || []).length;
  
  if (fixedContent !== originalContent) {
    fs.writeFileSync(fullPath, fixedContent, 'utf-8');
    console.log(`✅ Fixed ${filePath} (${changes} change${changes > 1 ? 's' : ''})`);
    return true;
  } else {
    console.log(`⚠️  No changes needed for ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing CSSProperties type errors...\n');
  
  let totalFilesFixed = 0;
  let totalChanges = 0;
  
  TARGET_FILES.forEach(filePath => {
    if (fixFile(filePath)) {
      totalFilesFixed++;
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${TARGET_FILES.length}`);
  console.log(`   Files fixed: ${totalFilesFixed}`);
  console.log(`   Expected error reduction: ~51 TypeScript errors`);
}

if (require.main === module) {
  main();
}

