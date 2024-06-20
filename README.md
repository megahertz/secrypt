# secrypt
[![Tests](https://github.com/megahertz/secrypt/workflows/Tests/badge.svg)](https://github.com/megahertz/secrypt/actions?query=workflow%3ATests)
[![npm version](https://img.shields.io/npm/v/secrypt?color=brightgreen)](https://www.npmjs.com/package/secrypt)

Secrypt is a tiny tool for keeping repository secrets encrypted. 
It is designed to be fast, easy to use and highly secure.

Key features:

- Encrypted data is saved close to the original file with `.enc` extension.
- AES-256-CBC is used for encryption
- Pretty small, a bit more than 300 lines of code. So it can be analyzed easily.
- It can be used as a standalone 
  [script](https://raw.githubusercontent.com/megahertz/secrypt/master/src/index.js)
  . It's helpful when you don't trust a third-party package to manage your
  secrets.
- No dependencies
- Supports multiple environments with different secret keys.

Is it safe to keep encrypted credentials in the git repository? Well, this is a
widely used approach at least in Ruby on Rails and in Fastlane.

## Installation

    npm install secrypt

## Usage

### TLDR
```
secrypt init
echo '{"dev": {"files": [".env.dev"] } }' > secrypt.config.json
secrypt encrypt

echo secrypt.keys >> .gitignore
echo .env.dev >> .gitignore
git add .gitignore secrypt.config.json .env.dev.enc
git commit -m 'chore: Add encrypted secrets'
```

### Explanation

1. Run `secrypt init` command that creates two files:
- default `secrypt.config.json` config
- a random key for the dev (default) environment in the `secrypt.key` file.

2. Add your secret file list to the `secrypt.config.json`:

```json
{
  "dev": {
    "files": [
      "secrets.json"
    ]
  }
}
```

3. Run `secrypt encrypt` to encrypt all files from the list.

Remember to add `secrypt.key` and `secrets.json` to `.gitignore`.

To decrypt secrets, just run `secrypt decrypt`.

By default, a secret key is stored in the `secrypt.key` file, but it can also
be passed using `SECRYPT_KEY` environment variable.

## CLI usage

```sh
Usage: secrypt COMMAND [options]

Commands:
  encrypt [...ONLY_THIS_FILES]
  decrypt [...ONLY_THIS_FILES]
  init

Options:
  -e, --environment ENV  Environment name (default: dev)
  -p, --prefix PATH      Change current working directory

Environment variables:
  SECRYPT_KEY    Key for encryption/decryption for the current environment
  SECRYPT_PREFIX Change current working directory
  NODE_ENV       Environment name
```

## Configuration

A config can be stored in `secrypt.config.json` or in `secrypt.config.js` file.
Each environment is configured separately:

```json
{
  "dev": {
    "files": [
      ".env.dev"
    ]
  },
  "prod": {
    "files": [
      ".env.prod"
    ]
  }
}
```

Here is the list of all available options:
- `files: string[]` - a list of files to encrypt/decrypt
- `key: string` - a secret key to use for encryption/decryption. Not recommended
  to use in the config file. Use `SECRYPT_KEY` environment variable instead.
- `decryptFn: (filePath, options) => Promise<string>` - it could be used to
  decrypt a file in a custom way. The function should return a path to the
  new decrypted file.

  Example:
  ```js
  async function decryptFn(sourcePath, options) {
    const destPath = sourcePath.replace(/\.enc$/, '');
    await mycryptlib.decrypt(sourcePath, destPath, options.config.key);
    return destPath;
  }
  ```
- `encryptFn: (filePath, options) => Promise<string>` - it could be used to
  encrypt a file in a custom way. The function should return a path to the 
  new encrypted file.

  Example:
  ```js
  async function encryptFn(sourcePath, options) {
    const destPath = sourcePath + '.enc';
    await mycryptlib.encrypt(sourcePath, destPath, options.config.key);
    return destPath;
  }
  ```

- `getFileListFn: (config: SecryptConfig) => Promise<string[]>` - return a list
  of files which should be encrypted.

  Example:
  ```js
  async function getFileListFn(config) {
    const files = await glob('secrets/*.yml');
    return files.map(file => path.resolve(file));
  }
  ```

- `resolveDecryptedPathFn: (filePath: string) => string` - it could be used to
  resolve a path to a decrypted file. By default, it removes `.enc` extension.

  Example:
  ```js
  function resolveDecryptedPathFn(filePath) {
    return filePath.replace(/\.enc$/, '');
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
