# haiku-plumbing

The Haiku plumbing is the integration of all the inner workings that run the Haiku platform on a user's workstation (distinguished from our services which run in the cloud). It includes process management, serialization, synchronization, and remote service calls. It is reponsible for actually carrying out the user-actions invoked either via the GUI ("creator") or the CLI, including launching those interfaces.

## Development

This package uses [`tsdown`](https://github.com/rolldown/tsdown) for TypeScript compilation.

- Build: `pnpm compile`
- Watch mode: `pnpm compile --watch` (runs `tsdown --watch`)
- Declaration files: `pnpm compile-declarations` (runs `tsc -p tsconfig.declarations.json`)

> **Note**: This package uses a hybrid approach - `tsdown` for fast compilation and `tsc` for generating TypeScript declaration files.
