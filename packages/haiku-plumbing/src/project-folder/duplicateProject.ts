import fse from "fs-extra";
const { copySync, existsSync, rmdirSync } = fse;
import { HaikuProject } from "haiku-sdk-creator/lib/bll/Project.mjs";
import { join } from "path";

export function duplicateProject(
  destinationProject: HaikuProject,
  sourceProject: HaikuProject,
  cb: any
) {
  try {
    // Make a dumb copy of the original project folder, minus all things Git.
    copySync(sourceProject.projectPath, destinationProject.projectPath);
    const gitPath = join(destinationProject.projectPath, ".git");
    if (existsSync(gitPath)) {
      rmdirSync(gitPath);
    }
    cb();
  } catch (err) {
    cb(err);
  }
}
