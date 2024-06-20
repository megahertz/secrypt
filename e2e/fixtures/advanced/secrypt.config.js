'use strict';

module.exports = {
  dev: {
    files: ['src/secrets.dev.js', '.env.dev'],
  },
  prod: {
    files: ['src/secrets.prod.js', '.env.prod'],
  },
};
