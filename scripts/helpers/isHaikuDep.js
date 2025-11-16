



import fs from "fs";
import path from "path";

export default (name) => {
  if (!name.startsWith('haiku-') && !name.startsWith('@haiku')) {
    return false;
  }

  try {
    const stats = fs.statSync(path.join(global.process.cwd(), 'packages', name));
    return stats.isDirectory();
  } catch (e) {
    return false;
  }
};
