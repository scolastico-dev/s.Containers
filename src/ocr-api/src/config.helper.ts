/** @hidden */
export const $err = (key: string) => {
  throw new Error(`Missing environment variable: ${key}`);
};

/** @hidden */
export const $str = (key: string, def?: string) =>
  process.env[key] || (typeof def === 'string' ? def : $err(key));

/** @hidden */
export const $int = (key: string, def?: number) =>
  parseInt($str(key, def?.toString()), 10);

/** @hidden */
export const $float = (key: string, def?: number) =>
  parseFloat($str(key, def?.toString()));

/** @hidden */
export const $bool = (key: string, def?: boolean) =>
  $str(key, def?.toString()).toLowerCase() === 'true';

/** @hidden */
export const $list = (key: string, def?: string[]) =>
  $str(key, def?.join(','))
    .split(',')
    .filter((x) => x !== '');

/** @hidden */
export const $oneOf = (key: string, values: string[], def?: string) => {
  const value = $str(key, def);
  if (!values.includes(value)) {
    throw new Error(`Invalid value for environment variable: ${key}`);
  }
  return value;
};

/** @hidden */
export const $url = (key: string, def?: string) => {
  let url = $str(key, def);
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

/** @hidden */
export const $urlWithTrailingSlash = (key: string, def?: string) =>
  $url(key, def) + '/';
