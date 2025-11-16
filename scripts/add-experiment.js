import fs from 'fs';
import path from 'path';
import typescript from 'typescript';
import { argv } from 'yargs';

import log from './helpers/log.js';

const args = argv._;

if (args.length !== 1) {
  log.warn('Usage: `pnpm add-experiment <ExperimentName>`');
  process.exit(1);
}

const experimentName = args[0];

if (!/^([A-Z][a-z]*)+([A-Z0-9][a-z]*)+$/.test(experimentName)) {
  log.warn(`Invalid experiment name: ${experimentName}. Experiment names should be in StudlyCase.`);
  process.exit(1);
}

const haikuCommonPath = path.join(process.cwd(), 'packages', 'haiku-common');
const experimentJsonPath = path.join(haikuCommonPath, 'config', 'experiments.json');
const experimentIndexPath = path.join(haikuCommonPath, 'src', 'experiments', 'index.ts');

const experimentJson = JSON.parse(fs.readFileSync(experimentJsonPath).toString());
if (Object.prototype.hasOwnProperty.call(experimentJson, experimentName)) {
  log.warn(`Experiment named ${experimentName} already exists!`);
  process.exit(1);
}

experimentJson[experimentName] = true;

fs.writeFileSync(experimentJsonPath, JSON.stringify(experimentJson, null, 2) + '\n');

const experimentSource = fs.readFileSync(experimentIndexPath).toString();
const sourceFile = typescript.createSourceFile(
  experimentIndexPath, experimentSource, typescript.ScriptTarget.ES2015, true,
);

typescript.forEachChild(sourceFile, (node) => {
  if (node.kind === typescript.SyntaxKind.EnumDeclaration && node.name.escapedText === 'Experiment') {
    const enumEndPosition = node.members[node.members.length - 1].end;
    // Hack in the new enum value.
    fs.writeFileSync(
      experimentIndexPath,
      experimentSource.slice(0, enumEndPosition) +
        `,\n  ${experimentName} = '${experimentName}'` +
        experimentSource.slice(enumEndPosition),
    );
  }
});

log.hat(`Added experiment ${experimentName}!

Usage:

import {Experiment, experimentIsEnabled} from 'haiku-common/src/experiments';
...
if (experimentIsEnabled(Experiment.${experimentName})) { ... }

Don't forget to run
$ pnpm compile-all
before continuing!`);
