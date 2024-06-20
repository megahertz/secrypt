#!/usr/bin/env node

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const stream = require('node:stream');

module.exports = {
  commandDecrypt,
  commandEncrypt,
  commandInit,
  decryptFile,
  encryptFile,
  getConfig,
  getFileList,
  readKeyFile,
  writeKeyFile,
};

main(...process.argv.slice(2)).catch((e) => {
  logError(e instanceof SecryptError ? e.message : e);
  process.exit(1);
});

async function main(command, ...args) {
  let actualCommand = command;
  if (args.includes('--help') || args.includes('-h')) {
    actualCommand = 'help';
  }

  switch (actualCommand) {
    case 'decrypt':
      return commandDecrypt(await getConfig({ args }));
    case 'encrypt':
      return commandEncrypt(await getConfig({ args }));
    case 'init':
      return commandInit(await getConfig({ args }));
    default:
      return commandHelp();
  }
}

async function commandDecrypt(config) {
  validateConfig(config);
  const fileList = await config.getFileListFn(config);

  for (const filePath of fileList) {
    const encryptedFilePath = config.resolveEncryptedPathFn(filePath);
    // eslint-disable-next-line no-await-in-loop
    await config.decryptFn(encryptedFilePath, { config });
  }

  const plural = fileList.length === 1 ? '' : 's';
  logInfo(`${fileList.length} file${plural} decrypted successfully`);
}

async function commandEncrypt(config) {
  validateConfig(config);
  const fileList = await config.getFileListFn(config);

  for (const filePath of fileList) {
    // eslint-disable-next-line no-await-in-loop
    await config.encryptFn(filePath, { config });
  }

  const plural = fileList.length === 1 ? '' : 's';
  logInfo(`${fileList.length} file${plural} encrypted successfully`);
}

async function commandInit(config) {
  const packageJson = read(path.join(config.prefix, 'package.json'));
  if (packageJson?.secrypt) {
    throw new SecryptError('secrypt is already has config in package.json');
  }

  let configPath = path.join(config.prefix, 'secrypt.config.js');
  if (!fs.existsSync(configPath)) {
    configPath = path.join(config.prefix, 'secrypt.config.json');
  }
  if (!fs.existsSync(configPath)) {
    configPath = '';
  }

  if (configPath) {
    throw new SecryptError(`Config file already exists: ${configPath}`);
  }

  const keyPath = path.join(config.prefix, 'secrypt.keys');
  if (fs.existsSync(keyPath)) {
    throw new SecryptError(`Key already exists: ${keyPath}`);
  }

  configPath = path.join(config.prefix, 'secrypt.config.json');
  await writeJson(configPath, {
    [config.environment]: { files: [] },
  });

  await writeKeyFile(keyPath, {
    [config.environment]: config.key
      || crypto.randomBytes(24).toString('base64').replace(/\W/g, ''),
  });

  logInfo(
    'Two new files were created:',
    `\nConfig: ${configPath}`,
    `\nKey file: ${keyPath}`,
    '\n\nPlease, update the config file with the file list to encrypt/decrypt.',
    'Make sure the key file and your unencrypted files are added to gitignore.',
  );
}

async function commandHelp() {
  logInfo([
    'Usage: secrypt COMMAND [options]',
    '',
    'Commands:',
    '  encrypt [...ONLY_THIS_FILES]',
    '  decrypt [...ONLY_THIS_FILES]',
    '  init',
    '',
    'Options:',
    '  -c, --config FILE      Config file path (default: secrypt.config.json)',
    '  -e, --environment ENV  Environment name (default: dev)',
    '  -p, --prefix PATH      Change current working directory',
    '',
    'Environment variables:',
    '  SECRYPT_KEY    Set the key for encryption/decryption',
    '  SECRYPT_PREFIX Set working directory path',
    '  NODE_ENV       Set the environment name',
  ].join('\n'));
}

async function decryptFile(filePath, { config }) {
  const header = await readFirstBytes(filePath, 64);
  const salt = header.subarray(16, 48);
  const iv = header.subarray(48, 64);
  const key = crypto.pbkdf2Sync(config.key, salt, 100_000, 32, 'sha512');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  const decryptedPath = config.resolveDecryptedPathFn(filePath);
  const readStream = fs.createReadStream(filePath, { start: header.length });
  const writeStream = fs.createWriteStream(decryptedPath);

  await stream.promises.pipeline(readStream, decipher, writeStream);

  logInfo(
    'decrypted',
    path.relative(config.prefix, filePath),
    '→',
    path.relative(config.prefix, decryptedPath),
  );
  return decryptedPath;
}

async function encryptFile(filePath, { config }) {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(config.key, salt, 100_000, 32, 'sha512');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  const encryptedPath = config.resolveEncryptedPathFn(filePath);
  const readStream = fs.createReadStream(filePath);
  const writeStream = fs.createWriteStream(encryptedPath);

  // 0-1: format version, 1-16: reserved, 16-48: salt, 48-64: iv
  const header = Buffer.concat([
    Buffer.alloc(1, 0),
    Buffer.alloc(15, 0),
    salt,
    iv,
  ]);
  await new Promise((resolve, reject) => {
    writeStream.write(header, (e) => (e ? reject(e) : resolve()));
  });

  await stream.promises.pipeline(readStream, cipher, writeStream);

  logInfo(
    'encrypted',
    path.relative(config.prefix, filePath),
    '→',
    path.relative(config.prefix, encryptedPath),
  );
  return encryptedPath;
}

/**
 * @param {string} fileName
 * @param {string} [cwd]
 * @return {string}
 */
function findUp(fileName, cwd) {
  let currentPath = cwd;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { root, dir } = path.parse(currentPath);

    if (fs.existsSync(path.join(currentPath, fileName))) {
      return currentPath;
    }

    if (currentPath === root) {
      return '';
    }

    currentPath = dir;
  }
}

async function getConfig({
  args = [],
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  const aliases = { c: 'config', e: 'environment', p: 'prefix' };

  const cli = { params: [] };
  let skipNext = false;
  args.forEach((arg, i) => {
    if (skipNext) {
      skipNext = false;
      return;
    }

    if (arg.startsWith('-')) {
      const key = arg.replace(/^-+/, '');
      cli[aliases[key] || key] = args[i + 1] || 'true';
      skipNext = true;
      return;
    }

    cli.params.push(arg);
  });

  const environment = cli.environment || env.NODE_ENV || 'dev';

  const prefix = (cli.prefix ? path.resolve(cwd, cli.prefix) : null)
    || (env.SECRYPT_PREFIX ? path.join(cwd, env.SECRYPT_PREFIX) : null)
    || findUp('secrypt.keys', cwd)
    || findUp('secrypt.config.js', cwd)
    || findUp('secrypt.config.json', cwd)
    || findUp('package.json', cwd)
    || cwd;

  const fileConfig = (cli.config && read(path.resolve(prefix, cli.config)))
    || read(path.join(prefix, 'secrypt.config.js'))
    || read(path.join(prefix, 'secrypt.config.json'))
    || read(path.join(prefix, 'package.json'), {}).secrypt
    || {};

  const keyFilePath = fileConfig[environment]?.keysFile || 'secrypt.keys';
  const keys = await readKeyFile(path.join(prefix, keyFilePath)) || {};

  return {
    decryptFn: decryptFile,
    encryptFn: encryptFile,
    getFileListFn: getFileList,
    resolveDecryptedPathFn: resolveDecryptedPath,
    resolveEncryptedPathFn: resoleEncryptedPath,

    files: [],
    key: env.SECRYPT_KEY || keys[environment] || '',
    ...fileConfig[environment],
    ...cli,
    environment,
    prefix,
  };
}

async function getFileList(config) {
  const { files, prefix } = config;
  if (!Array.isArray(files)) {
    throw new SecryptError('Wrong files configuration');
  }

  let fileList = files.map((f) => path.resolve(prefix, f));

  if (config.params.length > 0) {
    fileList = fileList.filter((f) => config.params.some((p) => f.endsWith(p)));
  }

  if (fileList.length === 0) {
    throw new SecryptError('No files to process found');
  }

  return fileList;
}

function logInfo(...args) {
  // eslint-disable-next-line no-console
  console.info(...args);
}

function logError(...args) {
  // eslint-disable-next-line no-console
  console.error(...args);
}

function read(filePath, returnOnFail = undefined) {
  try {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    return require(filePath);
  } catch (e) {
    return returnOnFail;
  }
}

async function readFirstBytes(filePath, size) {
  const chunks = [];
  const readStream = fs.createReadStream(filePath, { start: 0, end: size - 1 });
  for await (const chunk of readStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readKeyFile(keyPath) {
  const result = {};

  try {
    const fileContents = await fs.promises.readFile(keyPath, 'utf8');
    const lines = fileContents.split('\n').filter((line) => line.match(/^\w/i));
    for (const line of lines) {
      const [key, ...parts] = line.split(':').map((s) => s.trim());
      result[key] = parts.join(':');
    }
  } catch (e) {
    return undefined;
  }

  return result;
}

function resoleEncryptedPath(filePath) {
  return `${filePath}.enc`;
}

function resolveDecryptedPath(filePath) {
  return filePath.replace(/\.enc$/, '');
}

function validateConfig(config) {
  if (!config.key?.trim()) {
    throw new SecryptError('Key is required');
  }

  if (!config.files?.length) {
    throw new SecryptError('Files are not configured');
  }

  if (!config.environment) {
    throw new SecryptError('Environment is not configured');
  }
}

async function writeKeyFile(keyPath, keys) {
  const lines = Object.entries(keys).map(([k, v]) => `${k}: ${v}`);
  await fs.promises.writeFile(keyPath, lines.join('\n') + '\n', 'utf8');
}

async function writeJson(filePath, data) {
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

class SecryptError extends Error {}
