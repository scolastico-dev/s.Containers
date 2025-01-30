import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'yaml';
import { resolve, join } from 'path';
import commandLineArgs from 'command-line-args';
import dotenvExpand from 'dotenv-expand';
import dotenv from 'dotenv';
import deepmerge from 'deepmerge';

const optionDefinitions = [
  { name: 'input', alias: 'i', type: String },
  { name: 'output', alias: 'o', type: String },
  { name: 'debug', alias: 'd', type: Boolean },
];

dotenv.config();
const options = commandLineArgs(optionDefinitions);

function forEachStringInArray(arr, fn) {
  return arr.map((v) => {
    if (Array.isArray(v)) {
      return forEachStringInArray(v, fn);
    } else if (typeof v === 'string') {
      return fn(v);
    } else if (typeof v === 'object') {
      return forEachStringInObj(v, fn);
    }
    return v;
  });
}

function forEachStringInObj(obj, fn) {
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      obj[key] = forEachStringInArray(obj[key], fn);
    } else if (typeof obj[key] === 'string') {
      obj[key] = fn(obj[key]);
    } else if (typeof obj[key] === 'object') {
      obj[key] = forEachStringInObj(obj[key], fn);
    }
  }
  return obj;
}

function processFile(input) {
  if (options.debug) console.log('Processing', input);
  if (!existsSync(input)) {
    console.error(`File ${input} does not exist`);
    return {};
  }
  const file = readFileSync(input, 'utf8');
  const doc = parse(file, { merge: true });
  if (!doc || typeof doc !== 'object') {
    console.error(`File ${input} is not a valid YAML file`);
    return {};
  }
  if (options.debug) console.log('Parsed', doc);
  const expanded = forEachStringInObj(doc, (str) => {
    return dotenvExpand.expand({
      parsed: {
        ...process.env,
        'CURRENT_VALUE': str,
      },
      processEnv: {},
    }).parsed.CURRENT_VALUE;  
  });
  if (options.debug) console.log('Expanded', expanded);
  if (options.debug) console.log('IncludeArray', expanded.include);
  let res = JSON.parse(JSON.stringify({...expanded, include: undefined}));
  const merge = (include) => {
    if (options.debug) console.log('Merging', include);
    res = deepmerge(res, processFile(resolve(join(input, '..', include))));
  }
  if (expanded.include) for (const i of expanded.include) {
    if (options.debug) console.log('Include', i);
    if (!i) continue;
    if (typeof i === 'string') {
      merge(i);
    } else if (i.path) for (const p of i.path) {
      merge(p);
    } else {
      console.error('Invalid include statement in', input);
    }
  }
  for (const key in res) {
    if (key.startsWith('x-')) delete res[key];
  }
  if (res.volumes) for (const v in res.volumes) {
    if (!res.volumes[v]) res.volumes[v] = {};
  }

  return res;
}

const res = stringify(processFile(options.input || 'compose.yml'));
if (!options.output) {
  console.log(res);
} else {
  writeFileSync(options.output, res);
}
