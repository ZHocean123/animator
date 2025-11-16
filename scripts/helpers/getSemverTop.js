let fs = await import("fs");
let semver = await import("semver");
let { forEach } = await import("lodash-es");
let path = await import("path");
let packagesModule = await import("./packages.js");
let allPackages = packagesModule.default();

export default function getSemverTop () {
  let top;
  forEach(allPackages, (pack) => {
    const packageJsonPath = path.join(pack.abspath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!top) {
      top = packageJson.version;
    }
    if (semver.gt(packageJson.version, top)) {
      top = packageJson.version;
    }
  });
  return top;
};
