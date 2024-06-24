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

if (require.main === module) {
  main(...process.argv.slice(2)).catch((e) => {
    logError(e instanceof SecryptError ? e.message : e);
    process.exit(1);
  });
}

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

  for (const file of fileList) {
    await config.decryptFn(file);
    logInfo('decrypted', file.encrypted.rel, '→', file.decrypted.rel);
  }

  const plural = fileList.length === 1 ? '' : 's';
  logInfo(`${fileList.length} file${plural} decrypted successfully`);
}

async function commandEncrypt(config) {
  validateConfig(config);
  const fileList = await config.getFileListFn(config);

  for (const file of fileList) {
    await config.encryptFn(file);
    logInfo('encrypted', file.encrypted.rel, '→', file.decrypted.rel);
  }

  const plural = fileList.length === 1 ? '' : 's';
  logInfo(`${fileList.length} file${plural} encrypted successfully`);
}

async function commandInit(config) {
  const environment = config.environment === 'all' ? 'dev' : config.environment;
  const { keys, prefix } = config;

  const packageJson = read(path.join(prefix, 'package.json'));
  if (packageJson?.secrypt) {
    throw new SecryptError('secrypt already has config in package.json');
  }

  let configPath = path.join(prefix, 'secrypt.config.js');
  if (!fs.existsSync(configPath)) {
    configPath = path.join(prefix, 'secrypt.config.json');
  }
  if (!fs.existsSync(configPath)) {
    configPath = '';
  }

  if (configPath) {
    throw new SecryptError(`Config file already exists: ${configPath}`);
  }

  const keyPath = path.join(prefix, 'secrypt.keys');
  if (fs.existsSync(keyPath)) {
    throw new SecryptError(`Key already exists: ${keyPath}`);
  }

  configPath = path.join(prefix, 'secrypt.config.json');
  await writeJson(configPath, {
    files: {
      [environment]: [],
    },
  });

  await writeKeyFile(keyPath, {
    [environment]: keys[environment]
      || crypto.randomBytes(32).toString('base64url').replace(/\W/g, ''),
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
    '  encrypt [...ONLY_THESE_FILES]',
    '  decrypt [...ONLY_THESE_FILES]',
    '  init',
    '',
    'Common options:',
    '  -c, --config PATH      Config file path (default: secrypt.config.json)',
    '  -e, --environment ENV  Environment name (default: dev)',
    '  -p, --prefix PATH      Change current working directory',
    '',
    'Environment variables:',
    '  SECRYPT_KEY    Set the key for encryption/decryption',
    '  SECRYPT_PREFIX Set working directory path',
    '  NODE_ENV       Set the environment name',
  ].join('\n'));
}

async function decryptFile({ decrypted, encrypted, key }) {
  const header = await readFirstBytes(encrypted.full, 64);
  const salt = header.subarray(16, 48);
  const iv = header.subarray(48, 64);
  const cryptoKey = crypto.pbkdf2Sync(key, salt, 100_000, 32, 'sha512');
  const decipher = crypto.createDecipheriv('aes-256-cbc', cryptoKey, iv);

  const input = fs.createReadStream(encrypted.full, { start: header.length });
  const output = fs.createWriteStream(decrypted.full);

  await stream.promises.pipeline(input, decipher, output);
}

async function encryptFile({ decrypted, encrypted, key }) {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cryptoKey = crypto.pbkdf2Sync(key, salt, 100_000, 32, 'sha512');
  const cipher = crypto.createCipheriv('aes-256-cbc', cryptoKey, iv);

  const input = fs.createReadStream(decrypted.full);
  const output = fs.createWriteStream(encrypted.full);

  // 0-1: format version, 1-16: reserved, 16-48: salt, 48-64: iv
  const header = Buffer.concat([Buffer.alloc(1), Buffer.alloc(15), salt, iv]);
  await new Promise((resolve, reject) => {
    output.write(header, (e) => (e ? reject(e) : resolve()));
  });

  await stream.promises.pipeline(input, cipher, output);
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

  const environment = cli.environment || env.NODE_ENV || 'all';

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

  const keyFile = path.join(prefix, fileConfig.keyFile || 'secrypt.keys');
  const keys = (await readKeyFile(keyFile)) || fileConfig.keys || {};

  if (env.SECRYPT_KEY) {
    keys[environment === 'all' ? 'dev' : environment] = env.SECRYPT_KEY;
  }

  return {
    decryptFn: decryptFile,
    encryptFn: encryptFile,
    getFileListFn: getFileList,
    resolveEncryptedPathFn: (filePath) => `${filePath}.enc`,

    files: {},
    ...fileConfig,
    ...cli,
    keyFile,
    keys,
    environment,
    prefix,
  };
}

async function getFileList(config) {
  const { environment, keys, prefix } = config;

  let list = [];
  for (const [env, envFiles] of Object.entries(config.files)) {
    if (!keys[env] || (environment !== 'all' && env !== environment)) {
      continue;
    }

    for (const envFile of envFiles) {
      const decrypted = path.resolve(prefix, envFile);
      const encrypted = config.resolveEncryptedPathFn(decrypted);

      list.push({
        encrypted: { full: encrypted, rel: path.relative(prefix, encrypted) },
        decrypted: { full: decrypted, rel: path.relative(prefix, decrypted) },
        key: keys[env],
      });
    }
  }

  list = list.filter(({ key, decrypted, encrypted }) => {
    if (!key) {
      return false;
    }

    if (!fs.existsSync(decrypted.full) && !fs.existsSync(encrypted.full)) {
      return false;
    }

    if (config.params.length > 0) {
      return config.params.some((p) => decrypted.full.endsWith(p));
    }

    return true;
  });

  if (list.length === 0) {
    throw new SecryptError('No files to process found');
  }

  return list;
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

function validateConfig(config) {
  if (!config.environment) {
    throw new SecryptError('Environment is not configured');
  }

  if (Object.keys(config.files) < 1) {
    throw new SecryptError('Files are not configured');
  }

  if (Object.keys(config.keys) < 1) {
    throw new SecryptError('Key is required');
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
