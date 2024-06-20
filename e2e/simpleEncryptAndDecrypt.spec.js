'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Simple encrypt and decrypt', () => {
  const simpleDir = useDir(path.join(__dirname, 'fixtures/simple'));

  it('should encrypt files and the decrypt them back', async () => {
    await runSecrypt(['encrypt', '--key', 'test'], simpleDir.path);
    expect(await simpleDir.exists('secrets.json.enc')).toBe(true);
    await simpleDir.rm('secrets.json');
    expect(await simpleDir.exists('secrets.json')).toBe(false);

    await runSecrypt(['decrypt', '--key', 'test'], simpleDir.path);
    const secrets = await simpleDir.readJson('secrets.json');

    expect(secrets).toEqual({ apiKey: 'key', apiSecret: 'secret' });
  });
});
