# ui-common

Common UI components for Haiku projects.

## Setup

After cloning the repo:

```
$ pnpm install
$ pnpm global add @storybook/cli
```

Then develop with:

```
$ pnpm develop
```

> **Note**: This package uses [`tsdown`](https://github.com/rolldown/tsdown) for TypeScript compilation. The `develop` script runs `tsdown --watch` for fast incremental builds.

## Tests

Run the tests with:

```
$ pnpm test
```

## Linting

Lint with:

```
$ pnpm lint
```

Autofix lint errors with:

```
$ pnpm fix
```
