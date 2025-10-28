# secrypt
[![Tests](https://github.com/megahertz/secrypt/workflows/Tests/badge.svg)](https://github.com/megahertz/secrypt/actions?query=workflow%3ATests)
[![npm version](https://img.shields.io/npm/v/secrypt?color=brightgreen)](https://www.npmjs.com/package/secrypt)

Secrypt is a tiny tool for keeping repository secrets encrypted. 
It is designed to be fast, easy to use and highly secure.

Key features:

- Encrypted data is saved close to the original file with `.enc` extension.
- AES-256-CBC is used for encryption and PBKDF2 SHA-512 to derive the encryption 
  key
- Pretty small, a bit less than 400 lines of code. So it can be analyzed easily.
- It can be used as a standalone 
  [script](https://raw.githubusercontent.com/megahertz/secrypt/master/src/index.js)
  . It's helpful when you don't trust a third-party package to manage your
  secrets.
- No dependencies
- Supports multiple environments with different secret keys.
- Notify when local secrets are outdated (encrypted secrets changed remotely)

Is it safe to keep encrypted credentials in the git repository? Well, this is a
widely used approach at least in Ruby on Rails and in Fastlane.

## Installation

`npm install -D secrypt`

## Usage

### TLDR

```
secrypt init
echo '{ "files": { "dev": ["secrets.json"] } }' > secrypt.config.json
secrypt encrypt

echo secrypt.keys >> .gitignore
echo .env.dev >> .gitignore
git add .gitignore secrypt.config.json .env.dev.enc
git commit -m 'chore: Add encrypted secrets'
```

### Explanation

1. Run `secrypt init` command that creates two files:
- default `secrypt.config.json` config
- a random key for the dev (default) environment in the `secrypt.keys` file.

2. Add your secret file list to the `secrypt.config.json`:

```json
{
  "files": {
    "dev": ["secrets.json"]
  }
}
```

3. Run `secrypt encrypt` to encrypt all files from the list.

Remember to add `secrypt.keys` and `secrets.json` to `.gitignore`.

To decrypt secrets, just run `secrypt decrypt`.

By default, a secret key is stored in the `secrypt.keys` file, but it can also
be passed using `SECRYPT_KEY` environment variable.

## CLI usage

```sh
Usage: secrypt COMMAND [options]

Commands:
  encrypt [...ONLY_THESE_FILES]
  decrypt [...ONLY_THESE_FILES]
  init
  keys-regenerate
  keys-set


Options:
  -c, --config PATH      Config file path (default: secrypt.config.json)
  -e, --environment ENV  Environment name (default: dev)
  -p, --prefix PATH      Change current working directory

Environment variables:
  SECRYPT_KEY    Key for encryption/decryption for the current environment
  SECRYPT_PREFIX Change current working directory
  NODE_ENV       Environment name
```

## Configuration

A config can be stored in `secrypt.config.json`, `secrypt.config.js` or in the
`secrypt` section of `package.json`. Also, you can specify a path to the config
using `--config` command line option. Simple options like `keyFile` or 
`revisionFile` can be passed as command line options.

```json
{
  "files": {
    "dev": [".env.dev"],
    "prod": [".env.prod"]
  }
}
```

### Config options

- `environment: string` - a name of the environment. By default, it is `dev`.
- `files: Record<string, string[]>` - a list of files to encrypt/decrypt
- `keyFile: string` - a path to a file with secret keys. By default, it is
  `secrypt.keys`.
- `keys: Record<string, string>` - a secret keys to use for 
  encryption/decryption. Not recommended to use in the config file.
  Use `SECRYPT_KEY` environment variable instead.
- `revisionFile: string` - a path to a file with a revision number. By default,
  it is disabled. When it's defined, this file will be updated with the current
  revision number after encryption. Next, `secrypt revision-check` checks
  whether local unencrypted files should be updated.
- `prefix: string` - a path to a directory where the secrets should be stored.
  By default, it is the current working directory.

### Override default behavior
- `decryptFn: (file: SecryptFile) => Promise<void>` - it could be used to
  decrypt a file in a custom way.

  Example:
  ```js
  async function decryptFn({ decrypted, encryped, key }) {
    await mycryptlib.decrypt(encryped.full, decrypted.full, key);
  }
  ```
- `encryptFn: (file: SecryptFile) => Promise<void>` - it could be used to
  encrypt a file in a custom way.

  Example:
  ```js
  async function encryptFn({ decrypted, encryped, key }) {
    await mycryptlib.encrypt(decrypted.full, encryped.full, key);
  }
  ```

- `getFileListFn: (config: SecryptConfig) => Promise<SecryptFile[]>` - return a
  list of files which should be encrypted.

  Example:
  ```js
  async function getFileListFn(config) {
    const env = config.environment === 'all' ? 'dev' : config.environment;
    const files = await glob('secrets/*.yml');
    return files.map((rel) => ({
      decryped: { full: path.resolve(file), rel },
      encrypted: { full: path.resolve(`${file}.enc`), rel: `${file}.enc` },
      key: config.keys[env],
    }));
  }
  ```

- `resolveEncryptedPathFn: (filePath: string) => string` - it could be used to
  resolve a path to an encrypted file. By default, it adds `.enc` extension.

  Example:
  ```js
  function resolveEncryptedPathFn(filePath) {
    return filePath + '.enc';
  }
  ```

## License

Licensed under MIT.
