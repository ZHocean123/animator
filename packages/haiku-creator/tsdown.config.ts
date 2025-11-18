import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ['src/**/*.(t|m?j)s', 'src/**/*.(t|j)sx'],
  outDir: 'lib',
  format: ['esm'],
  clean: true,
  dts: false,
  target: "ES2022",
  external: [
    // Workspace dependencies - mark as external to avoid bundling
    "@haiku/core",
    "haiku-common",
    "haiku-glass",
    "haiku-sdk-creator",
    "haiku-serialization",
    "haiku-timeline",
    "haiku-ui-common"
  ]
});
