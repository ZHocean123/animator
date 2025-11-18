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
    '@haiku/core',
    '@haiku/sdk-inkstone',
    '@haiku/sdk-client',
    "haiku-common",
    "haiku-formats",
    "haiku-fs-extra",
    "haiku-serialization",
    "haiku-ui-common"
  ]
});
