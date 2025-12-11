import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'

import depTypes from '../constants/depTypes.js'
import packagePatterns from '../constants/packagePatterns.js'
import isHaikuDep from './isHaikuDep.js'

const PACKAGE_ROOT = path.join(process.cwd(), 'packages/')
const allPackages = {}

packagePatterns.forEach((pattern) => {
  const packages = glob.sync(path.posix.join(PACKAGE_ROOT.replace(/\\/g, '/'), pattern))
  packages.forEach((packageDir) => {
    const pkgJsonPath = path.join(packageDir, 'package.json')
    if (!fs.existsSync(pkgJsonPath)) {
      return
    }
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath))
    const shortname = pkgJson.name.replace('haiku-', '').replace('@haiku/', '')
    const pkg = {
      shortname,
      name: pkgJson.name,
      abspath: packageDir,
      pkg: pkgJson,
      version: pkgJson.version,
      remote: `git@github.com:HaikuTeam/${shortname}.git`,
      deps: new Set(),
      processed: false,
    }
    depTypes.forEach((depType) => {
      if (pkgJson[depType]) {
        for (const dep in pkgJson[depType]) {
          if (!isHaikuDep(dep)) {
            continue
          }
          pkg.deps.add(dep)
        }
      }
    })
    allPackages[pkgJson.name] = pkg
  })
})

function visit(pack, packages) {
  if (pack.processed) {
    return
  }

  pack.processed = true
  pack.deps.forEach((dep) => {
    visit(allPackages[dep], packages)
  })

  // Locate the correct outlet based on packages already processed.
  let spliceIndex = packages.length
  packages.forEach((foundPack, foundIndex) => {
    if (foundPack.deps.has(pack.name)) {
      spliceIndex = Math.min(spliceIndex, foundIndex)
    }
  })
  packages.splice(spliceIndex, 0, pack)
}

export default (names) => {
  const packages = []
  const unsortedPackages = Object.values(allPackages)
  unsortedPackages.forEach((pack) => {
    visit(pack, packages)
  })
  for (const packageName in allPackages) {
    allPackages[packageName].processed = false
  }

  if (names) {
    if (!Array.isArray(names)) {
      return packages.find(val => val.name === names)
    }

    return packages.filter(val => names.includes(val.name))
  }
  return packages
}
