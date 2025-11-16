



import { argv } from "yargs";
import { writeFileSync } from "fs";

writeFileSync(argv.outputPath, `export default ${JSON.stringify({lastCompileTime: new Date()})};`);
