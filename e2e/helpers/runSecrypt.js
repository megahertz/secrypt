'use strict';

const childProcess = require('child_process');
const path = require('path');

module.exports = runSecrypt;

async function runSecrypt(args, options) {
  const child = childProcess.spawn(
    process.argv[0],
    [path.join(__dirname, '../../src/index.js'), ...args],
    {
      cwd: typeof options === 'string' ? options : options?.cwd,
      env: {
        ...process.env,
        NODE_ENV: undefined,
        ...options.env,
      },
      stdio: 'pipe',
      ...(options && typeof options === 'object' ? options : {}),
    },
  );

  const output = [];
  child.stdout.on('data', (data) => output.push(data));
  child.stderr.on('data', (data) => output.push(data));

  return new Promise((resolve, reject) => {
    child
      .on('error', reject)
      .on('close', (code) => {
        if (!code) {
          // console.info(Buffer.concat(output).toString('utf8'));
          resolve();
        } else {
          const command = `secrypt ${args.join(' ')}`;
          const buf = Buffer.concat(output).toString('utf8');
          reject(new Error(
            `${command} exited with code ${code}. Output:\n${buf}`,
          ));
        }
      });
  });
}
