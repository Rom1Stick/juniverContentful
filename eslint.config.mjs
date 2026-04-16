import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  // Browser code par défaut
  {
    files: ['public/js/**/*.js', 'admin/assets/js/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  // Node scripts & Netlify Functions
  {
    files: ['scripts/**/*.js', 'netlify/functions/**/*.js', 'audit/**/*.mjs', '.audit/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      sourceType: 'module',
    },
  },
];
