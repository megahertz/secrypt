'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Skip encrypt files when they are unchanged', () => {
  const simpleDir = useDir(path.join(__dirname, 'fixtures/simple'));

  it('should encrypt files only once', async () => {
    const options = { cwd: simpleDir.path, env: { SECRYPT_KEY: 'test' } };

    // The first time, an encrypted file doesn't exist
    expect(await runSecrypt(['encrypt'], options)).toEqual([
      'encrypt secrets.json → secrets.json.enc',
      '1 file encrypted successfully',
    ]);

    // The second time, the encrypted file isn't changed
    expect(await runSecrypt(['encrypt'], options)).toEqual([
      'skip unchanged secrets.json',
      'no files were encrypted',
    ]);

    // Force encrypting the file
    expect(await runSecrypt(['encrypt', '--force'], options)).toEqual([
      'encrypt secrets.json → secrets.json.enc',
      '1 file encrypted successfully',
    ]);

    // Changing the source file should encrypt it again
    await simpleDir.write('secrets.json', '{}');
    expect(await runSecrypt(['encrypt'], options)).toEqual([
      'encrypt secrets.json → secrets.json.enc',
      '1 file encrypted successfully',
    ]);
  });
});
