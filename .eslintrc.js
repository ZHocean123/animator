module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General rules
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'lib/',
    'coverage/',
    '*.d.ts',
  ],
};