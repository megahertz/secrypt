'use strict';

const path = require('path');
const runSecrypt = require('./helpers/runSecrypt');
const useDir = require('./helpers/useDir');

describe('Revision check', () => {
  const revisionDir = useDir(path.join(__dirname, 'fixtures/revision'));

  it('should pass the check if revisions are equal', async () => {
    const options = { cwd: revisionDir.path };

    await revisionDir.write('secrypt.rev.local', '2');

    expect(await runSecrypt(['revision-check'], options)).toEqual([]);
  });

  it('should consider revision as old if local file not exists', async () => {
    const options = { cwd: revisionDir.path };

    expect(await runSecrypt(['revision-check'], options)).toEqual([
      'Your local secrets are outdated',
      'Run `secrypt decrypt` to update local secrets',
    ]);
  });

  it('should set exit code if revision outdated', async () => {
    const options = { cwd: revisionDir.path };

    await revisionDir.write('secrypt.rev.local', '1');

    await expect(runSecrypt(['revision-check', '--code', '1'], options))
      .rejects.toThrowError('with code 1');
  });

  it('should decrypt when revision outdated and the flag passed', async () => {
    const options = { cwd: revisionDir.path };

    await revisionDir.write('secrypt.rev.local', '1');

    expect(await runSecrypt(['revision-check', '--decrypt'], options)).toEqual([
      'Your local secrets are outdated',
      'decrypt secrets.json.enc → secrets.json',
      '1 file decrypted successfully',
    ]);

    expect(await revisionDir.read('secrypt.rev.local')).toBe('2');
  });

  it('should update local revision on decrypt', async () => {
    const options = { cwd: revisionDir.path };

    expect(await runSecrypt(['decrypt'], options)).toEqual([
      'decrypt secrets.json.enc → secrets.json',
      '1 file decrypted successfully',
    ]);

    expect(await revisionDir.read('secrypt.rev.local')).toBe('2');
  });

  it('should increase revision on encrypt', async () => {
    const options = { cwd: revisionDir.path };

    expect(await runSecrypt(['encrypt'], options)).toEqual([
      'encrypt secrets.json → secrets.json.enc',
      '1 file encrypted successfully',
    ]);

    expect(await revisionDir.read('secrypt.rev')).toBe('3');
    expect(await revisionDir.read('secrypt.rev.local')).toBe('3');
  });
});
