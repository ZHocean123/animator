import { join, resolve } from 'node:path'
import { readJsonSync } from 'fs-extra'

/**
 * Retrieve the experiment config from disk.
 */
export function getExperimentConfig() {
  const experimentsFolder = resolve(__dirname, '..', '..', 'config')
  return readJsonSync(join(experimentsFolder, 'experiments.json'))
}
