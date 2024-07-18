export interface SecryptConfig {
  environment: string;
  files: Record<string, string[]>;
  keyFile: string;
  keys: Record<string, string>;
  messages: {
    pasteKeysOnInit: string;
  };
  prefix: string;

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
export function decryptFile(file: SecryptFile): Promise<string>;
export function encryptFile(file: SecryptFile): Promise<string>;
export function getConfig(options: {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}): Promise<SecryptConfig>;
export function getFileList(config: SecryptConfig): Promise<SecryptFile[]>;
export function readKeyFile(filePath: string): Promise<Record<string, string>>;
export function writeKeyFile(
  filePath: string,
  data: Record<string, string>,
): Promise<void>;
