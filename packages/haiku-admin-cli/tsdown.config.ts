export default {
  entry: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
  outDir: 'lib',
  format: ['cjs', 'esm'],
  clean: true,
  watch: false,
  dts: true,
  sourcemap: true,
  minify: false,
  skipLibCheck: true,
  exports: true,
}
