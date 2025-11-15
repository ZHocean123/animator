# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haiku Animator is a desktop design tool for creating Lottie animations and interactive web components. It's an Electron application built with TypeScript, using a **monorepo structure with pnpm Workspaces** containing 15+ packages.

**Technology Stack:**
- Electron 2.0.8 desktop application
- TypeScript (all packages)
- React 15.6.2 for UI
- Node.js 8.15.1 (exact version required)
- pnpm 1.13.0 (exact version required)
- Python 2.7.16 (for native module compilation)

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
- Root: `index.js` (Electron bootstrap)
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
pnpm compile-all    # Compile all TypeScript packages
pnpm electron-rebuild  # Rebuild native Electron modules (use if binary errors)
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
pnpm compile        # Compile specific package
pnpm develop        # Watch mode for specific package
```

**Single Test:**
```bash
cd packages/{package-name}
pnpm test -- --grep "test name pattern"
```

## Environment Setup

**Critical Version Requirements (native modules won't compile otherwise):**
- Node.js: 8.15.1 (use nvm: `nvm install 8.15.1 && nvm use 8.15.1`)
- Yarn: 1.13.0
- Python: 2.7.16
- macOS: Xcode CLI tools, `brew install libgcrypt`
- Windows: `npm install -g windows-build-tools@2.3.0`
- Linux: `apt install build-essential libgcrypt20 libssl-dev`

**Environment Variables:**
Create `.env` file in root with:
```
HAIKU_API=backend_api_endpoint
HAIKU_WWW=web_frontend_url
HAIKU_ACCOUNT=account_service_url
HAIKU_SHARE=share_service_url
FIGMA_TOKEN=figma_token_for_windows_dev  # Required for Windows Figma login
```

## Development Workflow

1. **Initial setup:** `pnpm install && pnpm setup`
2. **Start development:** `pnpm start` (or `pnpm go` for defaults)
3. **Watch mode (optional):** `pnpm watch-all` in separate terminal
4. **Before committing:** `pnpm lint-all && pnpm test-all && pnpm compile-all`
5. **Debugging:** Use VS Code configurations:
   - Start app with `pnpm start`
   - Attach debugger: `attach-glass`, `attach-timeline`, or `attach-creator`
   - Debug ports: Plumbing (9221), Renderers (9222)

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

**Native Dependencies:**
- `nodegit` - Requires libgcrypt, Python 2.7, exact Node version
- `electron-rebuild` - May be needed after dependency changes
- FFmpeg static - Bundled for video export

**TypeScript Configuration:**
- Root `tsconfig.json` with path mappings (e.g., `@creator/*`, `@plumbing/*`)
- Module: CommonJS, Target: ES6
- Each package has `tsconfig.json` and `tsconfig.all.json`

**Build System:**
- TypeScript compilation per package
- Rollup for package bundling
- Webpack 4 for demos
- Electron Builder for desktop app packaging

**Legacy Code:**
- This was a commercial product (AGPL licensed)
- Some features removed during open-sourcing (publishing, sharing)
- Uses legacy versions (Electron 2, React 15, Node 8)

## Debugging & Profiling

**VS Code Debug Configurations** (`.vscode/launch.json`):
- `attach-glass` - Debug canvas renderer
- `attach-timeline` - Debug timeline UI
- `attach-creator` - Debug main application

**Logging/Profiling:**
```typescript
logger.time('profile-name')
// code to profile
logger.timeEnd('profile-name')
```
Output: `<timestamp>|<process>|info|d=<duration>|<profile-name>`

## Common Issues & Solutions

**Native module build errors:**
- Ensure exact Node 8.15.1 version: `nvm use 8.15.1`
- Install Python 2.7.16
- Run: `pnpm electron-rebuild`

**App won't start:**
- Check native binaries: `pnpm electron-rebuild`
- Verify all OS dependencies installed
- Check `.env` file exists with required variables

**Figma login not working (Windows):**
- Set `FIGMA_TOKEN` environment variable with valid token

## License & Status

- Source code: AGPL licensed
- Commercial heritage - some features removed during open-sourcing
- Looking for maintainers - codebase has known issues but good potential

## Additional Resources

- Main README: `README.md`
- Package-specific docs: `packages/{package}/README.md`
- VS Code configs: `.vscode/launch.json`
- Pull request template: `PULL_REQUEST_TEMPLATE.md`