import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

export default defineConfig([{
   files: ['**/*.{js,mjs,cjs}'],
   plugins: { js },
   extends: ['js/recommended'],
   languageOptions: {
      globals: {
         ...globals.browser, // window object is used in Util
         ...globals.node
      },
      ecmaVersion: 2022,
      sourceType: 'module'
   },
   rules: {
      indent: ['error', 3, {
         ignoreComments: true,
         SwitchCase: 1
      }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      eqeqeq: 'error',
      'no-trailing-spaces': ['warn', {
         ignoreComments: true
      }],
      'arrow-spacing': ['error', {
         before: true,
         after: true
      }],
      'no-unused-vars': ['warn', {
         varsIgnorePattern: '^_',
         argsIgnorePattern: '^_',
         caughtErrorsIgnorePattern: '^_'
      }],
      'object-curly-spacing': ['error', 'always'],
      'no-constant-condition': ['warn', {
         checkLoops: false
      }],
   },
}]);

