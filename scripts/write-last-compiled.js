import yargs from "yargs";
const { argv } = yargs;
import { writeFileSync } from "fs";

writeFileSync(
  argv.outputPath,
  `export default ${JSON.stringify({ lastCompileTime: new Date() })};`
);
