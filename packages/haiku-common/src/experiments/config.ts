import fse from "fs-extra";
const { readJsonSync } = fse;
import { join, resolve } from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/**
 * Retrieve the experiment config from disk.
 */
export const getExperimentConfig = (): any => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const experimentsFolder = resolve(__dirname, "..", "config");
  return readJsonSync(join(experimentsFolder, "experiments.json"));
};
