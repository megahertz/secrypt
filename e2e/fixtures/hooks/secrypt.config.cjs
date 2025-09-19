'use strict';

module.exports = {
  files: {
    dev: ['secrets.json'],
  },
  hooks: {
    preEncrypt() {
      // eslint-disable-next-line no-console
      console.info('Pre encrypt hook');
    },
    postDecrypt: 'echo Post decrypt hook',
  },
  messages: {
    preEncrypt: 'Static pre-encrypt message',
  },
};
