'use strict';

const childProcess = require('child_process');
const path = require('path');

module.exports = runSecrypt;

async function runSecrypt(args, options) {
  const child = childProcess.spawn(
    'node',
    [path.join(__dirname, '../../src/index.js'), ...args],
    {
      cwd: typeof options === 'string' ? options : options?.cwd,
      env: {
        ...process.env,
        NODE_ENV: undefined,
        ...options.env,
      },
      ...(options && typeof options === 'object' ? options : {}),
    },
  );

  return new Promise((resolve, reject) => {
    child
      .on('error', reject)
      .on('close', (code) => {
        if (!code) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
  });
}
