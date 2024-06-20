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
        environment: 'dev',
        files: [],
        key: '',
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

      expect(config).toMatchObject({ environment: 'prod', key: 'test' });
    });

    it('loads js config from the parent dir', async () => {
      const cwd = path.join(fixtures, 'advanced/src');
      const projectPath = path.dirname(cwd);
      const config = await getConfig({ cwd, env: {} });

      expect(config).toMatchObject({
        environment: 'dev',
        files: ['src/secrets.dev.js', '.env.dev'],
        key: 'devtest',
        prefix: projectPath,
      });
    });
  });

  describe('getFileList', () => {
    const cwd = path.join(fixtures, 'advanced');

    it('should return the list of all files', async () => {
      const config = await getConfig({ cwd, env: {} });
      const fileList = await getFileList(config);
      expect(fileList.map((f) => path.basename(f))).toEqual([
        'secrets.dev.js',
        '.env.dev',
      ]);
    });

    it('should return filtered list of all files', async () => {
      const config = await getConfig({ cwd, env: {}, args: ['.env.dev'] });
      const fileList = await getFileList(config);
      expect(fileList.map((f) => path.basename(f))).toEqual([
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
