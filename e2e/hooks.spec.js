'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Hooks', () => {
  const hooksDir = useDir(path.join(__dirname, 'fixtures/hooks'));

  it('should run different hooks', async () => {
    const options = { cwd: hooksDir.path, env: { SECRYPT_KEY: 'test' } };

    const encryptOutput = await runSecrypt(['encrypt'], options);
    expect(encryptOutput).toEqual([
      'Pre encrypt hook',
      'Static pre-encrypt message',
      'encrypted secrets.json.enc → secrets.json',
      '1 file encrypted successfully',
    ]);

    const decryptOutput = await runSecrypt(['decrypt'], options);
    expect(decryptOutput).toEqual([
      'decrypted secrets.json.enc → secrets.json',
      '1 file decrypted successfully',
      'Post decrypt hook',
    ]);
  });
});
