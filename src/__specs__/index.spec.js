'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { getConfig, getFileList, readKeyFile, writeKeyFile } = require('..');
const useDir = require('../../e2e/helpers/useDir');

const fixtures = path.join(__dirname, '../../e2e/fixtures');

describe('Secrypt', () => {
  describe(getConfig.name, () => {
    it('should return the default configuration', async () => {
      const config = await getConfig({ env: {} });

      expect(config).toMatchObject({
        environment: 'all',
        files: {},
        keys: {},
        prefix: path.join(__dirname, '../..'),
      });
    });

    describe('parses cli:', () => {
      const prefix = path.join(fixtures, 'simple');

      it('full option names', async () => {
        const config = await getConfig({
          args: ['--environment', 'prod', '--prefix', prefix],
        });

        expect(config).toMatchObject({ environment: 'prod', prefix });
      });

      it('aliases', async () => {
        const config = await getConfig({
          args: ['-e', 'prod', '-p', prefix],
        });

        expect(config).toMatchObject({ environment: 'prod', prefix });
      });

      it('other params', async () => {
        const config = await getConfig({
          args: ['file1', '-e', 'prod', 'file2', '-p', prefix, 'file3'],
        });

        expect(config).toMatchObject({
          environment: 'prod',
          params: ['file1', 'file2', 'file3'],
          prefix,
        });
      });
    });

    it('loads env values', async () => {
      const config = await getConfig({
        env: { ...process.env, NODE_ENV: 'prod', SECRYPT_KEY: 'test' },
      });

      expect(config).toMatchObject({
        environment: 'prod',
        keys: {
          prod: 'test',
        },
      });
    });

    it('loads js config from the parent dir', async () => {
      const cwd = path.join(fixtures, 'advanced/src');
      const projectPath = path.dirname(cwd);
      const config = await getConfig({ cwd, env: {} });

      expect(config).toMatchObject({
        environment: 'all',
        files: {
          dev: ['src/secrets.dev.js', '.env.dev'],
          prod: ['src/secrets.prod.js', '.env.prod'],
        },
        keys: { dev: 'devtest', prod: 'prodtest' },
        prefix: projectPath,
      });
    });

    it('loads config from package.json', async () => {
      const cwd = path.join(fixtures, 'package');
      const config = await getConfig({ cwd, env: {} });

      expect(config).toMatchObject({
        files: { dev: ['.env.dev'] },
        keys: { dev: 'custom keys file' },
      });
    });

    it('loads config from custom file', async () => {
      const cwd = path.join(fixtures, 'custom');
      const config = await getConfig({ args: ['-c', 'sc.json'], cwd, env: {} });

      expect(config).toMatchObject({
        files: { dev: ['.env.dev'] },
        keys: { dev: 'custom config path' },
      });
    });
  });

  describe('getFileList', () => {
    const cwd = path.join(fixtures, 'advanced');

    it('should return the list of all files', async () => {
      const config = await getConfig({ cwd, env: {} });
      const fileList = await getFileList(config);
      expect(fileList.map(({ decrypted }) => decrypted.rel)).toEqual([
        'src/secrets.dev.js',
        '.env.dev',
        'src/secrets.prod.js',
        '.env.prod',
      ]);
    });

    it('should return the list of dev files', async () => {
      const config = await getConfig({ cwd, args: ['-e', 'dev'] });
      const fileList = await getFileList(config);
      expect(fileList.map(({ decrypted }) => decrypted.rel)).toEqual([
        'src/secrets.dev.js',
        '.env.dev',
      ]);
    });

    it('should return filtered list of all files', async () => {
      const config = await getConfig({ cwd, env: {}, args: ['.env.dev'] });
      const fileList = await getFileList(config);
      expect(fileList.map(({ decrypted }) => decrypted.rel)).toEqual([
        '.env.dev',
      ]);
    });
  });

  describe(readKeyFile.name, () => {
    it('should parse a key file', async () => {
      const keyPath = path.join(fixtures, 'advanced/secrypt.keys');
      const file = await readKeyFile(keyPath);
      expect(file).toEqual({
        dev: 'devtest',
        prod: 'prodtest',
      });
    });
  });

  describe(writeKeyFile.name, () => {
    const tempDir = useDir(path.join(fixtures, 'simple'));
    it('should write a key file', async () => {
      const filePath = tempDir.join('keys.keys');
      await writeKeyFile(filePath, {
        env1: 'test1',
        env2: 'test2',
      });
      const content = await fs.promises.readFile(filePath, 'utf8');
      expect(content).toEqual([
        'env1: test1',
        'env2: test2',
        '',
      ].join('\n'));
    });
  });
});
