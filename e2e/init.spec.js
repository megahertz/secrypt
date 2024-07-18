'use strict';

const path = require('node:path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Init', () => {
  const emptyDir = useDir(path.join(__dirname, 'fixtures/empty'));

  it('should create a config and a random secret', async () => {
    await runSecrypt(['init'], emptyDir.path);

    expect(await emptyDir.readJson('secrypt.config.json')).toEqual({
      files: { dev: [] },
    });

    expect(await emptyDir.readLines('secrypt.keys')).toEqual([
      expect.stringMatching(/^dev: \w+$/),
      '',
    ]);
  });

  it('should create a config and a secret from env', async () => {
    await runSecrypt(['init'], {
      cwd: emptyDir.path,
      env: { SECRYPT_KEY: 'test' },
    });

    expect(await emptyDir.readJson('secrypt.config.json')).toEqual({
      files: { dev: [] },
    });

    expect(await emptyDir.readLines('secrypt.keys')).toEqual([
      expect.stringMatching(/^dev: test$/),
      '',
    ]);
  });
});
