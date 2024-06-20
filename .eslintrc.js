'use strict';

module.exports = {
  extends: 'airbnb-base',
  env: {
    es6: true,
    node: true,
    jest: true,
  },

  parserOptions: {
    sourceType: 'script',
    ecmaVersion: '2022',
  },

  rules: {
    'max-len': ['error', { code: 80 }],
    'no-use-before-define': 'off',
    'no-restricted-syntax': 'off',
    'object-curly-newline': 'off',
    'prefer-template': 'off',
    strict: ['error', 'global'],
  },

  overrides: [{
    files: ['**/*.spec.js'],
    settings: {
      'import/core-modules': ['vitest'],
    },
  }],
};
