// Minimal declarations for ProjectFile exports
// This should be expanded with actual exports from ProjectFile.js

export interface ProjectFileOptions {
  [key: string]: any
}

declare class ProjectFile {
  constructor(options?: ProjectFileOptions)
}

export { ProjectFile }
export * from './ProjectFile.js'
