import * as fs from "node:fs";
import * as path from "node:path";

import { getConfiguredExtensionSpecs, loadConfig, normalizeConfig, type OpencodeConfig } from "./config.js";
import {
  getConfigDir,
  getConfigFiles,
  getExtensionDirFromConfigDir,
  type ExtensionType,
} from "./paths.js";
import { scopeFromSource, type Scope } from "./scopes.js";

export interface ConfigExtensionSpec {
  spec: string;
  scope: Scope;
}

export interface LocalExtensionEntry {
  name: string;
  scope: Scope;
}

export function collectConfigExtensionSpecs(type: ExtensionType, scope: Scope, cwd?: string): ConfigExtensionSpec[] {
  return getConfigFiles(cwd)
    .filter((configFile) => scopeFromSource(configFile.source) === scope)
    .flatMap((configFile) => {
      const config = normalizeConfig((loadConfig(configFile.path) as OpencodeConfig | undefined) ?? {});
      return getConfiguredExtensionSpecs(config, type).map((spec) => ({ spec, scope }));
    });
}

export function collectLocalExtensionEntries(type: ExtensionType, scope: Scope, cwd?: string): LocalExtensionEntry[] {
  const entries: LocalExtensionEntry[] = [];

  for (const configDir of getConfigDir(cwd)) {
    if (scopeFromSource(configDir.source) !== scope) {
      continue;
    }

    const extensionDir = getExtensionDirFromConfigDir(configDir.path, type);
    if (!fs.existsSync(extensionDir)) {
      continue;
    }

    for (const entry of fs.readdirSync(extensionDir)) {
      const fullPath = path.join(extensionDir, entry);
      if (entry.endsWith(".ts") || entry.endsWith(".js") || fs.statSync(fullPath).isDirectory()) {
        entries.push({ name: entry, scope });
      }
    }
  }

  return entries;
}
