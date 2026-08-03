/* eslint-env node, es2022 */
module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript'
  ],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['out', 'dist', 'release', 'node_modules']
}
