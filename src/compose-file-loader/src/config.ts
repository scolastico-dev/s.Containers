import { FileOperationConfig, FileOperationMode } from './types';

/**
* Parses and validates all file operation configurations from environment variables.
* @returns A sorted array of file operation configurations.
*/
export function getFileOperationsFromEnv(): FileOperationConfig[] {
  const files: FileOperationConfig[] = [];
  
  for (const envVar in process.env) {
    if (envVar.startsWith('FILE_') && envVar.endsWith('_PATH')) {
      const prefix = envVar.substring(0, envVar.length - 5);
      const mode = (process.env[`${prefix}_MODE`] || 'create').toLowerCase() as FileOperationMode;
      const regexStr = process.env[`${prefix}_REGEX`];
      
      files.push({
        prefix,
        path: process.env[envVar]!,
        mode,
        content: process.env[`${prefix}_CONTENT`] || null,
        url: process.env[`${prefix}_URL`] || null,
        isUnsecure: process.env[`${prefix}_UNSECURE`] === 'true',
        isBase64: process.env[`${prefix}_BASE64`] === 'true',
        ownerUid: parseInt(process.env[`${prefix}_OVERRIDES_USER`] || '1000', 10),
        ownerGid: parseInt(process.env[`${prefix}_OVERRIDES_GROUP`] || '1000', 10),
        permissions: process.env[`${prefix}_OVERRIDES_PERMISSIONS`] || '777',
        regex: regexStr ? new RegExp(regexStr, 'g') : null,
        failOnError: process.env[`${prefix}_FAIL_ON_ERROR`] === 'true',
        fixDirPerms: process.env[`${prefix}_FIX_DIR_PERMS`] || 'false',
        sleepBefore: parseInt(process.env[`${prefix}_SLEEP_BEFORE`] || '0', 10),
        sleepAfter: parseInt(process.env[`${prefix}_SLEEP_AFTER`] || '0', 10),
      });
    }
  }
  
  // Sort files based on the ORDER environment variable
  const sortOrder = (process.env.ORDER || process.env.SORT || '')
  .split(',')
  .map((s) => 'FILE_' + s.trim())
  .filter((s) => s.length > 5);
  
  const sorted = files.sort((a, b) => {
    const aIndex = sortOrder.indexOf(a.prefix);
    const bIndex = sortOrder.indexOf(b.prefix);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex; // Both in sort order
    if (aIndex !== -1) return -1; // Only A is in sort order
    if (bIndex !== -1) return 1;  // Only B is in sort order
    return a.prefix.localeCompare(b.prefix); // Neither in sort, sort alphabetically
  });
  
  console.log('📄 Process order resolved:', JSON.stringify(sorted.map(s => s.prefix), null, 2));
  return sorted;
}
