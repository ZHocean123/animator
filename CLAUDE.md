# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haiku Animator is a desktop design tool for creating Lottie animations and interactive web components. It's built as a monorepo using Yarn workspaces with Electron for cross-platform desktop functionality.

## Development Commands

### Setup and Installation

```bash
# Install dependencies and initial setup
pnpm install && pnpm setup

# Start development with interactive prompts
pnpm start

# Start with good defaults (skip prompts)
pnpm go
```

### Build System (tsdown)

```bash
# Build all packages
pnpm build-all

# Development mode with file watching
pnpm dev-all

# Build specific package
cd packages/[package-name] && pnpm build

# Development mode for specific package
cd packages/[package-name] && pnpm dev

# Watch for changes across all packages
pnpm watch-all
```

### Testing and Quality

```bash
# Run all tests
pnpm test-all

# Lint all code
pnpm lint-all

# Auto-fix linting issues
pnpm fix

# Generate test reports
pnpm test-report

# Generate lint reports
pnpm lint-report
```

### Environment

- Create `.env` file in mono root for environment variables (see `.env.example`)
- Windows users: Set `FIGMA_TOKEN` environment variable for Figma integration

## Architecture

### Monorepo Structure

```
/packages/
├── @haiku/core/           # Core animation engine and timeline
├── @haiku/cli/            # Command-line interface
├── haiku-creator/         # Main application UI (React-based)
├── haiku-glass/           # UI components and rendering engine
├── haiku-plumbing/        # Core utilities and serialization
├── haiku-formats/         # Animation format handling (Lottie, GIF, video)
├── haiku-timeline/        # Timeline component
├── haiku-common/          # Shared utilities
└── haiku-ui-common/       # Shared UI components
```

### Key Entry Points

- `index.js` - Main Electron app entry point
- `packages/haiku-creator/src/electron.js` - Main application entry
- Protocol handlers: `haiku://` URLs

### TypeScript Configuration

- Uses tsdown for compilation (replaced tsc)
- Path aliases configured in root `tsconfig.json`:
  - `@core/*` → `packages/@haiku/core/src/*`
  - `@creator/*` → `packages/haiku-creator/src/*`
  - `@plumbing/*` → `packages/haiku-plumbing/src/*`
  - etc.

### Technology Stack

- **Runtime**: Electron 28.0.0
- **UI**: React 18.2.0 (with some React 15.6.2 legacy)
- **Language**: TypeScript 5.3.3
- **Build**: tsdown 0.15.1
- **Package Management**: Yarn 1.13.0 with workspaces
- **Testing**: Tape + tap-spec + NYC

## Debugging

### VS Code Debugging

- Install `Debugger for Chrome` extension
- Launch app normally, then attach to:
  - `attach-glass` - UI components
  - `attach-timeline` - Timeline component
  - `attach-creator` - Main application
- Debug ports: Plumbing (9221), Electron renderer (9222)

### Profiling

```javascript
logger.time('<profile-name>')
// code to profile
logger.timeEnd('<profile-name>')
```

## Development Notes

### Node Version Requirements

- **Node.js**: 22 (upgraded from 8.15.1)
- **Yarn**: 1.13.0 (exact version required)
- **Python**: 2.7.16 (for native module compilation)

### Native Dependencies

- `nodegit` requires libgcrypt (install via brew/apt)
- Windows: Run `pnpm electron-rebuild` if binary compilation fails
- Linux: Install build tools and libraries before setup

### Common Issues

- Figma login doesn't work in Windows development - use `FIGMA_TOKEN` env var
- Native module build failures are often due to incorrect Node.js version
- Use exact versions for dependencies where specified in README

## Testing Framework

- **Test Runner**: Tape
- **Reporter**: tap-spec
- **Coverage**: NYC (Istanbul)
- Tests located in `/test` directories within each package
- Debug configurations included for VS Code

## Recent Major Upgrades

- ✅ Node.js 8.15.1 → 22
- ✅ TypeScript 3.0.3 → 5.3.3
- ✅ Build system: tsc → tsdown
- ✅ Electron 2.0.8 → 28.0.0
