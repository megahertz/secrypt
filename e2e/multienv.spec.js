'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Multiple environments', () => {
  const advancedPath = useDir(path.join(__dirname, 'fixtures/advanced'));

  it('should decrypt only one env when only one key provided', async () => {
    await runSecrypt(['encrypt'], { cwd: advancedPath.path });

    await removeDecryptedFiles();
    await runSecrypt(['decrypt'], {
      cwd: advancedPath.path,
      env: { SECRYPT_KEYS: 'dev: devtest' },
    });

    expect(await advancedPath.readDir()).toEqual([
      '.env.dev',
      '.env.dev.enc',
      '.env.prod.enc',
      'secrypt.config.js',
      'src',
    ]);

    await removeDecryptedFiles();
    await runSecrypt(['decrypt'], {
      cwd: advancedPath.path,
      env: { SECRYPT_KEYS: 'dev: devtest\nprod: prodtest' },
    });

    expect(await advancedPath.readDir()).toEqual([
      '.env.dev',
      '.env.dev.enc',
      '.env.prod',
      '.env.prod.enc',
      'secrypt.config.js',
      'src',
    ]);
  });

  async function removeDecryptedFiles() {
    await advancedPath.rm('secrypt.keys');
    await advancedPath.rmProjectDecryptedFiles();
  }
});
