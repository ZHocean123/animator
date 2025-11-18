import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ['src/**/*.(t|j|mj)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  hash: false,
  target: "ES2022",
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    "@haiku/core",
    "haiku-common",
    "haiku-glass",
    "haiku-sdk-creator",
    "haiku-serialization",
    "haiku-timeline",
    "haiku-ui-common",
    "@haiku/sdk-inkstone"
  ]
});
