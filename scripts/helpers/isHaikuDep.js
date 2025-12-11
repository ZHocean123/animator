import fs from 'node:fs'
import path from 'node:path'

export default (name) => {
  if (!name.startsWith('haiku-') && !name.startsWith('@haiku')) {
    return false;
  }

  try {
    const stats = fs.statSync(path.join(process.cwd(), 'packages', name));
    return stats.isDirectory();
  } catch (e) {
    return false;
  }
}
