import { Injectable } from '@nestjs/common';
import {Express} from "express";
import {LocationConfig} from "../configuration";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import * as decompress from "decompress";

@Injectable()
export class ProcessorService {

  private async recursiveAction(current: string, action: (path: string) => Promise<void>|void, prefix: string|null = null) {
    if (prefix !== null) current = path.join(prefix, current);
    current = path.resolve(current);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) await Promise
      .all(fs.readdirSync(current).map((p) => this.recursiveAction(p, action, current)));
    await action(current);
  }

  async process(file: Express.Multer.File, location: LocationConfig) {
    const tmpFile = tmp.fileSync();
    fs.writeFileSync(tmpFile.name, file.buffer);
    fs.readdirSync(location.path).forEach((p) => {
      fs.rmSync(path.join(location.path, p), {recursive: true});
    });
    await new Promise((resolve, reject) => {
      decompress(tmpFile.name, location.path)
        .then(() => resolve(true))
        .catch((e) => reject(e));
    })
    if (Object.values(location.overrides).filter((v) => v !== null).length) {
      await this.recursiveAction(location.path, async (p) => {
        if (location.overrides.user !== null)
          fs.chownSync(p, location.overrides.user, -1);
        if (location.overrides.group !== null)
          fs.chownSync(p, -1, location.overrides.group);
        if (location.overrides.permissions !== null)
          fs.chmodSync(p, String(location.overrides.permissions));
        tmpFile.removeCallback();
      });
    }
  }

}
