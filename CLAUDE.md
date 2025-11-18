# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haiku Animator is a desktop design tool for creating Lottie animations and interactive web components. It's an Electron application built with TypeScript, using a **monorepo structure with pnpm Workspaces** containing 15+ packages.

**Technology Stack:**
- Electron 33.2.1 desktop application
- TypeScript 5.6+ (all packages)
- React 15.6.2 for UI
- Node.js 22.0.0+ (exact version required)
- pnpm 8.0.0+ (exact version required)
- ES Modules (ESM) throughout

## Repository Structure

This is a **monorepo** with all packages in the `packages/` directory:

**Key Packages:**
- `haiku-creator/` - Main Electron application and UI
- `haiku-glass/` - Canvas rendering engine
- `haiku-timeline/` - Animation timeline UI component
- `haiku-plumbing/` - Backend services (file watching, export pipeline, WebSocket server)
- `@haiku/core/` - Core animation engine and primitives
- `@haiku/cli/` - Command-line interface tools
- `haiku-serialization/` - Project data serialization
- `haiku-formats/` - Exporters (Lottie, GIF, video)
- `haiku-ui-common/` - Shared React components
- `haiku-common/` - Shared utilities
- `haiku-testing/` - Testing utilities and helpers

**Entry Points:**
- Root: `index.mjs` (Electron bootstrap)
- Creator: `packages/haiku-creator/src/electron.js`
- CLI: `packages/@haiku/cli/bin/haiku`

## Architecture

The application uses a **multi-process architecture**:
- **Electron main process** - Bootstraps app, manages windows
- **Plumbing process** - Backend services (file watching, export, WebSocket IPC)
- **Renderer processes** - Separate UI components:
  - Glass (canvas/rendering)
  - Timeline (animation controls)
  - Creator (main UI)

Processes communicate via WebSocket (`haiku-plumbing`) and Electron IPC.

## Essential Commands

**Setup:**
```bash
pnpm install && pnpm setup
```

**Development:**
```bash
pnpm start          # Start development with interactive prompts
pnpm go             # Start with defaults (no prompts)
pnpm watch-all      # Watch mode - compile on change (run in separate terminal)
```

**Build:**
```bash
pnpm compile-all    # Compile all TypeScript packages (uses tsdown)
pnpm electron-rebuild  # Rebuild native Electron modules (rarely needed)
```

**Quality Assurance:**
```bash
pnpm lint-all       # Lint all packages
pnpm fix            # Fix lint issues automatically
pnpm test-all       # Run all tests
pnpm test-report    # Generate test coverage report
```

**Package-specific commands** (run from package directory):
```bash
pnpm test           # Run tests for specific package
pnpm lint           # Lint specific package
pnpm compile        # Compile specific package (uses tsdown)
pnpm develop        # Watch mode for specific package
```

**Single Test:**
```bash
cd packages/{package-name}
pnpm test -- --grep "test name pattern"
```

**Starting with specific presets:**
```bash
pnpm start default           # Start with blank project
pnpm start glass             # Start with glass test project
pnpm start timeline          # Start with timeline test project
pnpm start fast              # Skip initial build (faster startup)
pnpm start haiku://...       # Open with specific protocol URI
```

## Environment Setup

**Critical Version Requirements:**
- Node.js: 22.0.0+ (use nvm: `nvm install 22 && nvm use 22`)
- pnpm: 8.0.0+
- macOS: Xcode CLI tools
- Windows: Visual Studio Build Tools
- Linux: `apt install build-essential libgtk-3-0 libgconf-2-4 libnss3`

**Environment Variables:**
Create `.env` file in root (see `.env.example`):
```
HAIKU_API=http://localhost:8080/
HAIKU_WWW=http://localhost:8000/
HAIKU_ACCOUNT=http://localhost:3001/
HAIKU_SHARE=http://localhost:3000/
FIGMA_TOKEN=figma_token_for_windows_dev  # Required for Windows Figma login
```

## Development Workflow

1. **Initial setup:** `pnpm install && pnpm setup`
2. **Start development:** `pnpm start` (or `pnpm go` for defaults)
3. **Watch mode (recommended):** `pnpm watch-all` in separate terminal for auto-compilation
4. **Before committing:** `pnpm lint-all && pnpm test-all && pnpm compile-all`
5. **Debugging:** Use VS Code configurations:
   - Start app with `pnpm start`
   - Attach debugger: `attach-glass`, `attach-timeline`, or `attach-creator`
   - Debug ports: Plumbing (9220), Renderers (9222)

## Testing

**Framework:** Tape test runner with custom assertions

**Test Structure:**
```
packages/{package}/test/
├── *.test.ts              # Unit tests
├── api/                   # API tests
├── perf/                  # Performance tests
├── render/                # Rendering tests
└── e2e/                   # End-to-end tests (Spectron for Electron)
```

**Coverage:** NYC with Cobertura reporter

## Key Technical Notes

**Module System (ESM):**
- All packages use ES Modules (`"type": "module"` in package.json)
- Use `import`/`export` syntax throughout
- Use `.js` extensions in import paths
- For CommonJS interop, use `createRequire` from `module`

**Build System:**
- **tsdown** for TypeScript compilation (faster than tsc)
- Rollup for package bundling
- Webpack 5 for demos
- Electron Builder for desktop app packaging

**TypeScript Configuration:**
- Root `tsconfig.json` with path mappings (e.g., `@creator/*`, `@plumbing/*`)
- Module: esnext, ModuleResolution: bundler, Target: esnext
- Each package has `tsconfig.json` and `tsconfig.all.json`

**Build Order (important for dependencies):**
```
haiku-common → @haiku/core → haiku-serialization → haiku-plumbing → 
haiku-formats → haiku-ui-common → haiku-timeline/haiku-glass → 
haiku-sdk-creator → @haiku/sdk-client → @haiku/cli → haiku-creator
```

**lodash-es Migration:**
- Project uses `lodash-es` instead of `lodash` for better tree-shaking
- Import pattern: `import find from 'lodash-es/find.js'`
- All functionality remains the same, only import syntax changed

**Native Dependencies:**
- `isomorphic-git` - Pure JavaScript git implementation
- FFmpeg static - Bundled for video export
- Electron native modules rebuilt automatically during setup

**Legacy Code Notes:**
- Originally commercial product (AGPL licensed)
- Some features removed during open-sourcing (publishing, sharing)
- Still uses legacy React 15.6.2 (upgrade in progress)

## Debugging & Profiling

**VS Code Debug Configurations** (`.vscode/launch.json`):
- `attach-glass` - Debug canvas renderer (port 9222)
- `attach-timeline` - Debug timeline UI (port 9222)
- `attach-creator` - Debug main application (port 9222)
- Plumbing debugs on port 9220

**Logging/Profiling:**
```typescript
logger.time('profile-name')
// code to profile
logger.timeEnd('profile-name')
```
Output: `<timestamp>|<process>|info|d=<duration>|<profile-name>`

## Common Issues & Solutions

**Native module build errors:**
- Ensure Node 22+: `nvm use 22`
- Run: `pnpm electron-rebuild`
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`

**App won't start:**
- Check native binaries: `pnpm electron-rebuild`
- Verify `.env` file exists with required variables
- Try: `pnpm compile-all` to rebuild all packages

**Figma login not working (Windows):**
- Set `FIGMA_TOKEN` environment variable with valid token
- Cannot use Figma login in development mode on Windows without token

**Import errors or module not found:**
- Ensure `.js` extensions in import paths
- Check tsconfig path mappings match package structure
- Verify package build order dependencies

**Compilation is slow:**
- Use `pnpm watch-all` in separate terminal for incremental builds
- tsdown is much faster than tsc for full rebuilds
- Use `pnpm start fast` to skip initial compilation

## License & Status

- Source code: AGPL licensed
- Commercial heritage - some features removed during open-sourcing
- Open to new maintainers - active modernization in progress

## Additional Resources

- Main README: `README.md`
- Package-specific docs: `packages/{package}/README.md`
- VS Code configs: `.vscode/launch.json`
- Pull request template: `PULL_REQUEST_TEMPLATE.md`
- lodash-es migration report: `lodash-es-migration-test-report.md`
