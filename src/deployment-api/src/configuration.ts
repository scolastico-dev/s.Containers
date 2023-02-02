import { Logger } from "@nestjs/common";

const log = new Logger('Configuration');

export type KeyConfig = {
  type: 'key' | 'md5' | null,
  secret: string,
}

export type OverrideConfig = {
  user: number | null,
  group: number | null
  permissions: number | null
}

export type LocationConfig = {
  name: string,
  path: string,
  key: KeyConfig,
  overrides: OverrideConfig,
}

export type Configuration = {
  port: number,
  locations: LocationConfig[],
  md5Iterations: number,
}

export default (): Configuration => {
  // will use env variables in the format APP_PORT, APP_LOCATIONS_<name>_PATH, etc.
  const r = /^APP_LOCATIONS_([A-Z0-9_]+)_(PATH|OVERRIDES_USER|OVERRIDES_GROUP|OVERRIDES_PERMISSIONS|KEY_TYPE|KEY_SECRET)$/i;
  let locations: LocationConfig[] = [];
  for (const [name, value] of Object.entries(process.env)) {
    const match = name.match(r);
    if (!match) continue;
    const [_, locationName, key] = match;
    const index = locations.findIndex(l => l.name === locationName);
    let location = {
      name: locationName,
        path: '',
        key: {
        type: null,
          secret: '',
      },
      overrides: {
        user: null,
          group: null,
          permissions: null,
      },
    };
    if (index !== -1) location = locations.splice(index, 1)[0];
    if (String(key).startsWith('OVERRIDES_')) {
      const [_, k] = key.split('_');
      location.overrides[k.toLowerCase()] = Number(value);
    } else if (String(key).startsWith('KEY_')) {
      const [_, k] = key.split('_');
      if (k.toLowerCase() === 'type' && !['key', 'md5'].includes(value)) {
        log.error(`Location '${locationName}' has an invalid key type '${value}'`);
        continue;
      }
      location.key[k.toLowerCase()] = value;
    } else location[key.toLowerCase()] = value;
    locations.push(location);
  }

  locations = locations.filter(l => {
    let valid = true;
    if (!l.path) {
      log.error(`Location '${l.name}' does not have a path`);
      valid = false;
    }
    const secretLength = l.key.secret.length;
    if (!secretLength) {
      log.error(`Location '${l.name}' does not have a secret`);
      valid = false;
    }
    if (secretLength < 32) {
      log.error(`Location '${l.name}' does not have a secret of at least 32 characters`);
      valid = false;
    }
    return valid;
  });

  if (!locations.length) log.warn('No locations configured. (Did you forget to set APP_LOCATIONS_* environment variables?)');

  locations.forEach(l => log.log(`Location '${l.name}' configured with path '${l.path}'`));

  return {
    port: Number(process.env.APP_PORT) || 3000,
    md5Iterations: Number(process.env.MD5_ITERATIONS) || 25,
    locations,
  } as Configuration;
}
