'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { getConfig } = require('../../src');

module.exports = useDir;

function useDir(dirPath) {
  const secryptTestDir = path.join(os.tmpdir(), 'secrypt-test');

  const dir = {
    originalPath: dirPath,
    path: '',
    cleanTempDir: true,
    async exists(subPath) {
      try {
        await fs.promises.stat(dir.join(subPath));
        return true;
      } catch (e) {
        return false;
      }
    },
    async fullRemove() {
      await fs.promises.rm(dir.path, { recursive: true });
    },
    join(subPath) {
      return path.join(dir.path, subPath);
    },
    async read(subPath) {
      return fs.promises.readFile(dir.join(subPath), 'utf8');
    },
    async readDir(subPath = '', options = {}) {
      return fs.promises.readdir(dir.join(subPath), options);
    },
    async readProjectConfig(projectSubPath = '') {
      return getConfig({ cwd: dir.join(projectSubPath) });
    },
    async readJson(subPath) {
      return JSON.parse(await dir.read(subPath));
    },
    async readLines(subPath) {
      const content = await dir.read(subPath);
      return content.split('\n').map((line) => line.trim());
    },
    async rm(subPath, { throwOnMissing = false, ...options } = {}) {
      try {
        await fs.promises.rm(dir.join(subPath), {
          recursive: true,
          ...options,
        });
      } catch (e) {
        if (e.code !== 'ENOENT' || throwOnMissing) {
          throw e;
        }
      }
    },
    async rmProjectDecryptedFiles(projectSubPath = '') {
      const config = await dir.readProjectConfig(projectSubPath);
      const files = Object.values(config.files).flat();
      await Promise.all(
        files.map((file) => dir.rm(file, { recursive: false })),
      );
    },
    async write(subPath, content) {
      await fs.promises.writeFile(dir.join(subPath), content);
    },
  };

  beforeEach(async () => {
    await fs.promises.mkdir(secryptTestDir, { recursive: true });
    dir.path = await fs.promises.mkdtemp(
      path.join(secryptTestDir, `${path.basename(dirPath)}-`),
    );
    await fs.promises.cp(dirPath, dir.path, { recursive: true });
  });

  afterEach(async () => {
    if (dir.cleanTempDir) {
      await dir.fullRemove();
    }
  });

  return dir;
}
