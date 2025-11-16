#!/usr/bin/env node

/**

import fs from "fs";
import path from "path";

 * Fix Electron remote API deprecation issues
 * 
 * This script fixes the Electron remote API deprecation by replacing:
 * - import electron from 'electron';
 *   electron.remote.dialog.showSaveDialog(...)
 *   
 * With:
 * - import {remote} from '@electron/remote';
 *   remote.dialog.showSaveDialog(...)
 * 
 * Target file: packages/haiku-creator/src/utils/autoUpdate.ts
 */




const TARGET_FILE = 'packages/haiku-creator/src/utils/autoUpdate.ts';

function fixElectronRemote() {
  const fullPath = path.join(process.cwd(), TARGET_FILE);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${TARGET_FILE}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;

  // Check if file already uses @electron/remote
  if (content.includes('@electron/remote')) {
    console.log(`⚠️  File already uses @electron/remote: ${TARGET_FILE}`);
    return false;
  }

  // Replace import statement
  const importPattern = /import electron from 'electron';?/g;
  if (importPattern.test(content)) {
    content = content.replace(importPattern, "import {remote} from '@electron/remote';");
    changes++;
    console.log(`✅ Fixed import statement in ${TARGET_FILE}`);
  }

  // Replace electron.remote with remote
  const remotePattern = /electron\.remote/g;
  if (remotePattern.test(content)) {
    content = content.replace(remotePattern, 'remote');
    changes++;
    console.log(`✅ Fixed remote usage in ${TARGET_FILE}`);
  }

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Successfully fixed ${TARGET_FILE} (${changes} change${changes > 1 ? 's' : ''})`);
    return true;
  } else {
    console.log(`⚠️  No changes needed for ${TARGET_FILE}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing Electron remote API deprecation...\n');
  
  const fixed = fixElectronRemote();
  
  console.log(`\n📊 Summary:`);
  console.log(`   Expected error reduction: ~3 TypeScript errors`);
  console.log(`   Status: ${fixed ? '✅ Fixed' : '⚠️  No changes needed'}`);
}

if (require.main === module) {
  main();
}

