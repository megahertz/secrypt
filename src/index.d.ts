import type { Decipher } from 'node:crypto';
import type { Readable } from 'node:stream';

type Command =
  | 'decrypt'
  | 'encrypt'
  | 'init'
  | 'keysRegenerate'
  | 'keysSet'
  | 'revisionCheck';

type Hooks =
  | 'alreadyInit'
  | `pre${Capitalize<Command>}`
  | `post${Capitalize<Command>}`
  | 'revisionOld'
  | 'skipEncrypt'
  | 'successfulInit';

export interface SecryptConfig {
  environment: string;
  files: Record<string, string[]>;
  hooks: Record<Hooks, string | ((config: SecryptConfig) => Promise<void>)>;
  keyFile: string;
  keys: Record<string, string>;
  messages: {
    pasteKeysOnInit: string;
  } & Record<Hooks, string>;
  prefix: string;
  revisionFile?: string;

  decryptFn: (file: SecryptFile) => Promise<string>;
  encryptFn: (file: SecryptFile) => Promise<string>;
  getFileListFn: (config: SecryptConfig) => Promise<SecryptFile[]>;
  resolveEncryptedPathFn: (filePath: string) => string;
}

export interface SecryptFile {
  decrypted: { full: string; rel: string };
  encrypted: { full: string; rel: string };
  key: string;
}

export function commandDecrypt(config: SecryptConfig): Promise<void>;
export function commandEncrypt(config: SecryptConfig): Promise<void>;
export function commandInit(config: SecryptConfig): Promise<void>;
export function commandKeysRegenerate(config: SecryptConfig): Promise<void>;
export function commandKeysSet(config: SecryptConfig): Promise<void>;
export function commandRevisionCheck(config: SecryptConfig): Promise<void>;
export function createDecipher(
  options: { filePath: string; key: string }
): Promise<{
  decipher: Decipher;
  encryptedStream: Readable;
  header: Buffer;
}>;
export function decryptFile(file: SecryptFile): Promise<string>;
export function encryptFile(file: SecryptFile): Promise<string>;
export function getConfig(options?: {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}): Promise<SecryptConfig>;
export function getFileList(config: SecryptConfig): Promise<SecryptFile[]>;
export function isRevisionActual(config: SecryptConfig): Promise<boolean>;
export function readKey(content: string): Record<string, string>;
export function readKeyFile(filePath: string): Promise<Record<string, string>>;
export function readRevision(
  config: SecryptConfig,
  options?: { local?: boolean }
): Promise<number>;
export function writeKeyFile(
  filePath: string,
  data: Record<string, string>,
): Promise<void>;
export function writeRevision(
  config: SecryptConfig,
  revision: number,
  options?: { local?: boolean; primary?: boolean }
): Promise<void>;
