import * as fs from "node:fs";
import * as path from "node:path";
import { extractPackageName } from "../utils/package.js";
import { getCacheDir, getPluginsDir } from "../utils/paths.js";
import { type PluginSource, detectPluginSource } from "../utils/plugin-source.js";
import { readConfig } from "./config.js";
import { detectPM, pmExec, type PackageManager } from "./pm.js";

export type Scope = "global" | "project";

export interface PluginListItem {
  name: string;
  scope: Scope;
  source: PluginSource;
  installed: string;
  latest: string;
  updatable: boolean;
}

interface LoosePluginConfig {
  plugin?: unknown;
  plugins?: unknown;
}

function getPMExecutionOrder(): PackageManager[] {
  const preferredPM = detectPM();
  return preferredPM === "bun" ? ["bun", "npm"] : ["npm", "bun"];
}

function findVersionInDependencyTree(node: unknown, packageName: string): string | null {
  if (Array.isArray(node)) {
    for (const value of node) {
      const found = findVersionInDependencyTree(value, packageName);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!node || typeof node !== "object") {
    return null;
  }

  const record = node as Record<string, unknown>;
  const directValue = record[packageName];
  if (directValue && typeof directValue === "object" && !Array.isArray(directValue)) {
    const directVersion = (directValue as { version?: unknown }).version;
    if (typeof directVersion === "string" && directVersion.length > 0) {
      return directVersion;
    }
  }

  const name = record.name;
  const version = record.version;
  if (name === packageName && typeof version === "string" && version.length > 0) {
    return version;
  }

  for (const value of Object.values(record)) {
    const found = findVersionInDependencyTree(value, packageName);
    if (found) {
      return found;
    }
  }

  return null;
}

function getInstalledVersionFromPM(packageName: string, cacheDir: string): string {
  for (const pm of getPMExecutionOrder()) {
    try {
      if (pm === "bun") {
        const output = pmExec(pm, ["pm", "ls", "--json"], cacheDir);
        const parsed = JSON.parse(output) as unknown;
        const version = findVersionInDependencyTree(parsed, packageName);
        if (version) {
          return version;
        }
        continue;
      }

      const output = pmExec(pm, ["ls", packageName, "--json", "--depth=0"], cacheDir);
      const data = JSON.parse(output) as {
        dependencies?: Record<string, { version?: string }>;
      };
      const version = data.dependencies?.[packageName]?.version;
      if (version) {
        return version;
      }
    } catch {
      // Try next package manager
    }
  }

  return "n/a";
}

function getLatestVersionFromPM(packageName: string): string {
  for (const pm of getPMExecutionOrder()) {
    try {
      const output = pm === "bun"
        ? pmExec(pm, ["pm", "view", packageName, "version"])
        : pmExec(pm, ["view", packageName, "version"]);
      const version = output.trim();
      if (version.length > 0) {
        return version;
      }
    } catch {
      // Try next package manager
    }
  }

  return "n/a";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function getInstalledPluginVersion(packageName: string): string {
  const bareName = extractPackageName(packageName);
  const cacheDir = getCacheDir();
  const pkgPath = path.join(cacheDir, "node_modules", bareName, "package.json");

  try {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    if (pkg.version) {
      return pkg.version;
    }
  } catch {
    // continue to package-manager lookup
  }

  return getInstalledVersionFromPM(bareName, cacheDir);
}

function getLatestPluginVersion(packageName: string): string {
  const bareName = extractPackageName(packageName);
  return getLatestVersionFromPM(bareName);
}

function mergePluginItems(items: PluginListItem[]): PluginListItem[] {
  const map = new Map<string, PluginListItem>();

  for (const item of items) {
    const key = `${item.name}|${item.scope}|${item.source}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    const hasBetterInstalled = existing.installed === "n/a" && item.installed !== "n/a";
    const hasBetterLatest = existing.latest === "n/a" && item.latest !== "n/a";
    if (hasBetterInstalled || hasBetterLatest) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

export function resolveScopes(opts: { global?: boolean; project?: boolean }): Scope[] {
  if (opts.global && !opts.project) {
    return ["global"];
  }
  if (opts.project && !opts.global) {
    return ["project"];
  }
  return ["project", "global"];
}

export function collectPluginsForScope(scope: Scope, cwd?: string): PluginListItem[] {
  const { config } = readConfig(scope, cwd);
  const raw = config as LoosePluginConfig;
  const pluginSpecs = [...toStringArray(raw.plugin), ...toStringArray(raw.plugins)];

  const fromConfig = pluginSpecs.map((spec) => {
    const source = detectPluginSource(spec);
    if (source === "local") {
      const localSpec = spec.replace(/^file:\/\//, "");
      return {
        name: path.basename(localSpec),
        scope,
        source,
        installed: "n/a",
        latest: "n/a",
        updatable: false,
      };
    }

    const name = extractPackageName(spec);
    const installed = getInstalledPluginVersion(name);
    const latest = getLatestPluginVersion(name);
    return {
      name,
      scope,
      source,
      installed,
      latest,
      updatable: installed !== "n/a" && latest !== "n/a" && installed !== latest,
    };
  });

  const fromDirectory: PluginListItem[] = [];
  const pluginsDir = getPluginsDir(scope, cwd);
  if (fs.existsSync(pluginsDir)) {
    for (const entry of fs.readdirSync(pluginsDir)) {
      const fullPath = path.join(pluginsDir, entry);
      if (entry.endsWith(".ts") || entry.endsWith(".js") || fs.statSync(fullPath).isDirectory()) {
        fromDirectory.push({
          name: entry,
          scope,
          source: "local",
          installed: "n/a",
          latest: "n/a",
          updatable: false,
        });
      }
    }
  }

  return mergePluginItems([...fromConfig, ...fromDirectory]).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) {
      return byName;
    }
    return a.scope.localeCompare(b.scope);
  });
}

export function collectPlugins(scopes: Scope[], cwd?: string): PluginListItem[] {
  const items: PluginListItem[] = [];
  for (const scope of scopes) {
    items.push(...collectPluginsForScope(scope, cwd));
  }
  return mergePluginItems(items).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) {
      return byName;
    }
    return a.scope.localeCompare(b.scope);
  });
}
