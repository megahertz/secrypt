'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Environments', () => {
  const advancedPath = useDir(path.join(__dirname, 'fixtures/advanced'));

  it('should load keys from SECRYPT_KEY_{ENV}', async () => {
    await runSecrypt(['encrypt'], { cwd: advancedPath.path });

    await advancedPath.rmProjectDecryptedFiles();
    await advancedPath.rm('secrypt.keys');
    await runSecrypt(['decrypt'], {
      cwd: advancedPath.path,
      env: { SECRYPT_KEY_DEV: 'devtest', SECRYPT_KEY_PROD: 'prodtest' },
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
});
