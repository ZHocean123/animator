# Haiku Creator

Electron + React application representing the Haiku GUI.

## Setup / Development

You should use the 'mono' repo to develop on creator, not this.

It has a set of dev tools to use for starting this up, etc.

## Build System

This package uses [`tsdown`](https://github.com/rolldown/tsdown) for TypeScript compilation instead of the traditional `tsc`. This provides faster build times and better developer experience. The build commands are:
- `pnpm compile` - Build the package
- `pnpm develop` - Watch mode for development
