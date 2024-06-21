export interface SecryptConfig {
  environment: string;
  files: string[];
  key: string;
  keyFile: string;
  prefix: string;

  decryptFn: (
    filePath: string,
    options: { config: SecryptConfig },
  ) => Promise<string>;
  encryptFn: (
    filePath: string,
    options: { config: SecryptConfig },
  ) => Promise<string>;
  getFileListFn: (config: SecryptConfig) => Promise<string[]>;
  resolveDecryptedPathFn: (filePath: string) => string;
  resolveEncryptedPathFn: (filePath: string) => string;
}

export function commandDecrypt(config: SecryptConfig): Promise<void>;
export function commandEncrypt(config: SecryptConfig): Promise<void>;
export function commandInit(config: SecryptConfig): Promise<void>;
export function decryptFile(
  filePath: string,
  options: { config: SecryptConfig },
): Promise<string>;
export function encryptFile(
  filePath: string,
  options: { config: SecryptConfig },
): Promise<string>;
export function getConfig(options: {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}): Promise<SecryptConfig>;
export function getFileList(config: SecryptConfig): Promise<string[]>;
export function readKeyFile(filePath: string): Promise<Record<string, string>>;
export function writeKeyFile(
  filePath: string,
  data: Record<string, string>,
): Promise<void>;
