'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

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
    async readJson(subPath) {
      return JSON.parse(await dir.read(subPath));
    },
    async readLines(subPath) {
      const content = await dir.read(subPath);
      return content.split('\n').map((line) => line.trim());
    },
    async rm(subPath) {
      await fs.promises.rm(path.join(dir.path, subPath), { recursive: true });
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
