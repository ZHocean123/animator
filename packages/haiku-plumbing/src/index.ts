/**
 * Haiku Plumbing - Core exports
 *
 * 主入口文件，聚合所有公共 API
 */

// Environment & Configuration
export { default as envInfo } from './envInfo'
// Envoy Integration
export { default as getExporterListener } from './envoy/getExporterListener'
// Git Integration (explicit re-exports to avoid conflicts)
export { init, status } from './Git'
export * from './GitSimple'
export { default as haikuInfo } from './haikuInfo'

// Core Classes
export { default as Master } from './Master'

export { default as MasterGitProject } from './MasterGitProject'
export { default as MasterModuleProject } from './MasterModuleProject'

export { default as Plumbing } from './Plumbing'
// Project Folder Operations
export * from './project-folder/AssetUtils'
// TODO: Fix Raven export - temporarily commented out due to TypeScript declaration issues
// export {default as Raven} from './Raven';

export * from './project-folder/copyExternalExampleFilesToProject'
export * from './project-folder/createCDNBundle'
export * from './project-folder/duplicateProject'
export * from './project-folder/getResourcesPath'
export * from './project-folder/ProjectDefinitions'
export * from './project-folder/semverBumpPackageJson'
// Project File Management (named exports)
export * from './ProjectFile'

// Publish Hooks
export { default as saveExport } from './publish-hooks/saveExport'

export { default as Watcher } from './Watcher'
