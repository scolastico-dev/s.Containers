// src/types.ts

/**
* Defines the possible modes for a file operation.
*/
export type FileOperationMode =
| 'create'
| 'update'
| 'upsert'
| 'delete'
| 'replace'
| 'append'
| 'prepend'
| 'perm'
| 'permr'
| 'mkdir'
| 'unzip'
| 'exists'
| 'missing'
| 'npm'
| 'cp';

/**
* Represents the configuration for a single file operation, parsed from environment variables.
*/
export interface FileOperationConfig {
  prefix: string;
  path: string;
  mode: FileOperationMode;
  content: string | null;
  url: string | null;
  isUnsecure: boolean;
  isBase64: boolean;
  ownerUid: number;
  ownerGid: number;
  permissions: string;
  regex: RegExp | null;
  failOnError: boolean;
  fixDirPerms: string | false;
  sleepBefore: number;
  sleepAfter: number;
}
