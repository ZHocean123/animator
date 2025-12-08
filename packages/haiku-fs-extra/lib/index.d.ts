// Type definitions for haiku-fs-extra 5.1.2
// Project: https://github.com/jprichardson/node-fs-extra
// Definitions by: Alan Agius <https://github.com/alan-agius4>, Daniel Rosenwasser <https://github.com/DanielRosenwasser>, Junyoung Clare Jang <https://github.com/ailrun>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import * as fs from 'fs';
import * as klaw from 'klaw';

declare namespace fsExtra {
  interface CopyOptions {
    dereference?: boolean;
    filter?: RegExp | ((src: string, dest: string) => boolean);
    preserveTimestamps?: boolean;
    recursive?: boolean;
  }

  interface MoveOptions {
    clobber?: boolean;
    limit?: number;
    mkdirp?: boolean;
  }

  interface ReadOptions {
    encoding?: string | null;
    flag?: string;
  }

  interface WriteOptions {
    encoding?: string | null;
    flag?: string;
    mode?: number;
  }

  interface JsonReadOptions extends ReadOptions {
    throws?: boolean;
  }

  interface JsonWriteOptions extends WriteOptions {
    EOL?: string;
    replacer?: (key: string, value: any) => any;
    spaces?: string | number;
  }

  interface JsonOutputOptions extends JsonWriteOptions {
    fs?: {
      writeFile: (path: string, data: string, options: JsonWriteOptions, callback: (err: Error | null) => void) => void;
      mkdir: (path: string, callback: (err: Error | null) => void) => void;
    };
  }

  interface JsonFile {
    spaces: number | string;
    read(file: string, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
    read(file: string, options: JsonReadOptions, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
    readSync(file: string, options?: JsonReadOptions): any;
    write(file: string, obj: any, callback?: (err: NodeJS.ErrnoException) => void): void;
    write(file: string, obj: any, options: JsonWriteOptions, callback?: (err: NodeJS.ErrnoException) => void): void;
    writeSync(file: string, obj: any, options?: JsonWriteOptions): void;
  }

  interface WalkOptions extends klaw.Options {
  }
}

declare module 'haiku-fs-extra' {
  // Copy functions
  function copy(src: string, dest: string, callback?: (err: Error) => void): void;
  function copy(src: string, dest: string, options: fsExtra.CopyOptions, callback?: (err: Error) => void): void;

  // Copy Sync functions
  function copySync(src: string, dest: string, options?: fsExtra.CopyOptions): void;

  // Move functions
  function move(src: string, dest: string, callback?: (err: Error) => void): void;
  function move(src: string, dest: string, options: fsExtra.MoveOptions, callback?: (err: Error) => void): void;

  // Remove functions
  function remove(path: string, callback?: (err: Error) => void): void;
  function removeSync(path: string): void;
  function removePatternSync(path: string): void;

  // Create functions
  function createFile(path: string, callback?: (err: Error) => void): void;
  function createFileSync(path: string): void;
  function ensureFile(path: string, callback?: (err: Error) => void): void;
  function ensureFileSync(path: string): void;

  // Link functions
  function createLink(srcpath: string, dstpath: string, callback?: (err: Error) => void): void;
  function createLinkSync(srcpath: string, dstpath: string): void;
  function ensureLink(srcpath: string, dstpath: string, callback?: (err: Error) => void): void;
  function ensureLinkSync(srcpath: string, dstpath: string): void;

  // Symlink functions
  function createSymlink(srcpath: string, dstpath: string, type?: string, callback?: (err: Error) => void): void;
  function createSymlinkSync(srcpath: string, dstpath: string, type?: string): void;
  function ensureSymlink(srcpath: string, dstpath: string, type?: string, callback?: (err: Error) => void): void;
  function ensureSymlinkSync(srcpath: string, dstpath: string, type?: string): void;

  // Mkdir functions
  function mkdirs(path: string, callback?: (err?: Error) => void): void;
  function mkdirsSync(path: string): void;
  function mkdirp(path: string, callback?: (err?: Error) => void): void;
  function mkdirpSync(path: string): void;
  function ensureDir(path: string, callback?: (err?: Error) => void): void;
  function ensureDirSync(path: string): void;

  // Output functions
  function outputFile(file: string, data: any, callback?: (err: Error) => void): void;
  function outputFile(file: string, data: any, options: { encoding?: string | null, flag?: string }, callback?: (err: Error) => void): void;
  function outputFileSync(file: string, data: any, options?: { encoding?: string | null, flag?: string }): void;

  // Read functions
  function readFile(file: string, callback?: (err: NodeJS.ErrnoException, data: Buffer) => void): void;
  function readFile(file: string, encoding: string, callback?: (err: NodeJS.ErrnoException, data: string) => void): void;
  function readFile(file: string, options: { encoding?: string | null, flag?: string }, callback?: (err: NodeJS.ErrnoException, data: Buffer | string) => void): void;

  // Write functions
  function writeFile(file: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;
  function writeFile(file: string, data: any, options: { encoding?: string | null, flag?: string, mode?: number }, callback?: (err: NodeJS.ErrnoException) => void): void;

  // Empty directory functions
  function emptyDir(path: string, callback?: (err: Error) => void): void;
  function emptyDirSync(path: string): void;
  function emptydir(path: string, callback?: (err: Error) => void): void;
  function emptydirSync(path: string): void;

  // Walk functions
  function walk(dir: string, options?: fsExtra.WalkOptions): klaw.WalkStream;
  function walkSync(dir: string, filelist?: string[]): string[];

  // JSON functions
  function readJson(file: string, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
  function readJson(file: string, options: fsExtra.JsonReadOptions, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
  function readJsonSync(file: string, options?: fsExtra.JsonReadOptions): any;
  function readJSON(file: string, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
  function readJSON(file: string, options: fsExtra.JsonReadOptions, callback?: (err: NodeJS.ErrnoException, data: any) => void): any;
  function readJSONSync(file: string, options?: fsExtra.JsonReadOptions): any;

  function writeJson(file: string, object: any, callback?: (err: NodeJS.ErrnoException) => void): void;
  function writeJson(file: string, object: any, options: fsExtra.JsonWriteOptions, callback?: (err: NodeJS.ErrnoException) => void): void;
  function writeJsonSync(file: string, object: any, options?: fsExtra.JsonWriteOptions): void;
  function writeJSON(file: string, object: any, callback?: (err: NodeJS.ErrnoException) => void): void;
  function writeJSON(file: string, object: any, options: fsExtra.JsonWriteOptions, callback?: (err: NodeJS.ErrnoException) => void): void;
  function writeJSONSync(file: string, object: any, options?: fsExtra.JsonWriteOptions): void;

  function outputJson(file: string, object: any, callback?: (err: NodeJS.ErrnoException) => void): void;
  function outputJson(file: string, object: any, options: fsExtra.JsonOutputOptions, callback?: (err: NodeJS.ErrnoException) => void): void;
  function outputJsonSync(file: string, object: any, options?: fsExtra.JsonOutputOptions): void;
  function outputJSON(file: string, object: any, callback?: (err: NodeJS.ErrnoException) => void): void;
  function outputJSON(file: string, object: any, options: fsExtra.JsonOutputOptions, callback?: (err: NodeJS.ErrnoException) => void): void;
  function outputJSONSync(file: string, object: any, options?: fsExtra.JsonOutputOptions): void;

  // Export all fs functions and add fs-extra specific functions
  interface FsExtra extends fs {
    // Copy functions
    copy: typeof copy;
    copySync: typeof copySync;

    // Move functions
    move: typeof move;

    // Remove functions
    remove: typeof remove;
    removeSync: typeof removeSync;
    removePatternSync: typeof removePatternSync;

    // Create functions
    createFile: typeof createFile;
    createFileSync: typeof createFileSync;
    ensureFile: typeof ensureFile;
    ensureFileSync: typeof ensureFileSync;

    // Link functions
    createLink: typeof createLink;
    createLinkSync: typeof createLinkSync;
    ensureLink: typeof ensureLink;
    ensureLinkSync: typeof ensureLinkSync;

    // Symlink functions
    createSymlink: typeof createSymlink;
    createSymlinkSync: typeof createSymlinkSync;
    ensureSymlink: typeof ensureSymlink;
    ensureSymlinkSync: typeof ensureSymlinkSync;

    // Mkdir functions
    mkdirs: typeof mkdirs;
    mkdirsSync: typeof mkdirsSync;
    mkdirp: typeof mkdirp;
    mkdirpSync: typeof mkdirpSync;
    ensureDir: typeof ensureDir;
    ensureDirSync: typeof ensureDirSync;

    // Output functions
    outputFile: typeof outputFile;
    outputFileSync: typeof outputFileSync;

    // Empty directory functions
    emptyDir: typeof emptyDir;
    emptyDirSync: typeof emptyDirSync;
    emptydir: typeof emptydir;
    emptydirSync: typeof emptydirSync;

    // Walk functions
    walk: typeof walk;
    walkSync: typeof walkSync;

    // JSON functions
    readJson: typeof readJson;
    readJsonSync: typeof readJsonSync;
    readJSON: typeof readJSON;
    readJSONSync: typeof readJSONSync;
    writeJson: typeof writeJson;
    writeJsonSync: typeof writeJsonSync;
    writeJSON: typeof writeJSON;
    writeJSONSync: typeof writeJSONSync;
    outputJson: typeof outputJson;
    outputJsonSync: typeof outputJsonSync;
    outputJSON: typeof outputJSON;
    outputJSONSync: typeof outputJSONSync;

    // jsonfile object
    jsonfile: fsExtra.JsonFile;

    // spaces property for jsonfile
    spaces: number | string;
  }

  const _fs: FsExtra;
  export = _fs;
}