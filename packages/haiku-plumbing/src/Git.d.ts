// Minimal declarations for Git exports
// This should be expanded with actual exports from Git.js

export declare const globalCallbacks: {}
export declare const globalPushOpts: {}
export declare const globalFetchOpts: {}
export declare const globalCloneOpts: {}

export declare function open(pwd: string, cb: Function): void
export declare function forceOpen(pwd: string, cb: Function): void
export declare function init(pwd: string, cb: Function): void
export declare function status(pwd: string, opts: any, cb: Function): void
export declare function hardReset(pwd: string, targetRef: string, cb: Function): void

// Additional exports should be added here as needed
