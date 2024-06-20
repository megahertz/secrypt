'use strict';

const secrets = loadSecrets(process.env.NODE_ENV || 'dev');

// eslint-disable-next-line no-console
console.log(secrets);

function loadSecrets(env) {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(`./secrets.${env}`);
}
