# AGENTS.md

## Development Commands

### Build & Development
- `pnpm build-all` - Build all packages with tsdown
- `pnpm dev-all` - Development mode with file watching
- `pnpm watch-all` - Watch for changes across all packages

### Testing
- `pnpm test-all` - Run all tests across packages
- `pnpm test-report` - Generate test coverage reports
- Single package: `cd packages/[package] && pnpm test`
- Single test file: `cd packages/[package] && pnpm ts ./node_modules/.bin/tape 'test/specific.test.ts' | tap-spec`

### Linting & Formatting
- `pnpm lint-all` - Lint all packages
- `pnpm fix` - Auto-fix linting issues across all packages
- Single package: `cd packages/[package] && pnpm lint --fix`

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled with noImplicitAny, noUnusedLocals, noUnusedParameters
- Use path aliases: `@core/*`, `@creator/*`, `@plumbing/*`, etc.
- ES2022 target with ESNext modules

### Import Style
- Use absolute imports with path aliases (e.g., `import {foo} from '@core/utils'`)
- Prefer named exports over default exports
- Group imports: external libraries first, then internal modules

### Naming Conventions
- Files: kebab-case (e.g., `animation-timeline.ts`)
- Variables/Functions: camelCase
- Classes/Types: PascalCase
- Constants: UPPER_SNAKE_CASE

### Error Handling
- Use proper TypeScript error types
- Prefer async/await over Promise chains
- Include meaningful error messages with context

### ESLint Configuration
- Uses @antfu/eslint-config with React support
- Auto-formatting enabled
- Run `pnpm fix` to auto-resolve linting issues