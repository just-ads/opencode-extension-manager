import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePluginsPath } from "../utils/compatible.js";

import { collectConfigExtensionSpecs, collectLocalExtensionEntries } from "./discovery.js";
import { detectPM, pmInfo } from "./pm.js";
import { getCacheDir, getPluginsDir, type ConfigScope } from "./paths.js";
import { extractPackageName } from "../utils/package.js";
import { detectPluginSource, type PluginSource } from "../utils/plugin-source.js";

import type { OpencodeConfig } from "./config.js";
import type { Scope } from "./scopes.js";

export interface PluginListItem {
  name: string;
  scope: Scope;
  source: PluginSource;
  installed: string;
  latest: string;
  updatable: boolean;
}

function toPluginList(config: OpencodeConfig): string[] {
  return Array.isArray(config.plugin) ? [...config.plugin] : [];
}

function getPluginPackageInfoFromPM(packageName: string): Record<string, unknown> | null {
  const bareName = extractPackageName(packageName);
  // const pm = detectPM();
  return pmInfo('npm', bareName);
}

export function getConfiguredPluginSpecs(config: OpencodeConfig): string[] {
  return toPluginList(config);
}

export function findPluginEntry(config: OpencodeConfig, packageName: string): string | undefined {
  const bareName = extractPackageName(packageName);
  return toPluginList(config).find((entry) => extractPackageName(entry) === bareName);
}

export function addPlugin(config: OpencodeConfig, packageName: string): void {
  const existingEntry = findPluginEntry(config, packageName);
  if (existingEntry) {
    return;
  }

  config.plugin = [...toPluginList(config), packageName];
}

export function removePlugin(config: OpencodeConfig, packageName: string): string | undefined {
  const existingEntry = findPluginEntry(config, packageName);
  if (!existingEntry) {
    return undefined;
  }

  config.plugin = toPluginList(config).filter((entry) => entry !== existingEntry);
  return existingEntry;
}

export function installLocalPlugin(sourcePath: string, scope: ConfigScope, cwd?: string): string {
  const pluginsDir = getPluginsDir(scope, cwd);
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  const basename = path.basename(sourcePath);
  const destinationPath = path.join(pluginsDir, basename);
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }

  return basename;
}

export function findLocalPluginPath(name: string, scope: ConfigScope, cwd?: string): string | null {
  const pluginsDir = getPluginsDir(scope, cwd);
  const candidates = [name, `${name}.ts`, `${name}.js`];

  for (const candidate of candidates) {
    const candidatePath = path.join(pluginsDir, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

export function removeLocalPlugin(pluginPath: string): void {
  const stat = fs.statSync(pluginPath);
  if (stat.isDirectory()) {
    fs.rmSync(pluginPath, { recursive: true, force: true });
    return;
  }

  fs.unlinkSync(pluginPath);
}

export function getInstalledPluginVersion(packageName: string, cacheDir = getCacheDir()): string | null {
  const bareName = extractPackageName(packageName);
  const packageJsonPath = path.join(cacheDir, "node_modules", resolvePluginsPath(bareName), "package.json");

  try {
    const raw = fs.readFileSync(packageJsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" && parsed.version.length > 0 ? parsed.version : null;
  } catch {
    return null;
  }
}

export function getLatestPluginVersion(packageName: string): string | null {
  const packageInfo = fetchPluginPackageInfo(packageName);
  const version = packageInfo?.["version"];
  return typeof version === "string" && version.length > 0 ? version : null;
}

export function fetchPluginPackageInfo(packageName: string): Record<string, unknown> | null {
  return getPluginPackageInfoFromPM(packageName);
}

function getPluginNameFromLocalSpecifier(spec: string): string {
  const localSpec = spec.replace(/^file:\/\//, "");
  return localSpec.split(/[\\/]/).pop() ?? localSpec;
}

function toPluginListItem(spec: string, scope: Scope): PluginListItem {
  const source = detectPluginSource(spec);
  if (source === "local") {
    return {
      name: getPluginNameFromLocalSpecifier(spec),
      scope,
      source,
      installed: "n/a",
      latest: "n/a",
      updatable: false,
    };
  }

  const name = extractPackageName(spec);
  const installed = getInstalledPluginVersion(name) ?? "n/a";
  const latest = getLatestPluginVersion(name) ?? "n/a";

  return {
    name,
    scope,
    source,
    installed,
    latest,
    updatable: installed !== "n/a" && latest !== "n/a" && installed !== latest,
  };
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

export function collectPluginsForScope(scope: Scope, cwd?: string): PluginListItem[] {
  const fromConfig = collectConfigExtensionSpecs("plugins", scope, cwd).map(({ spec }) => toPluginListItem(spec, scope));
  const fromDirectory = collectLocalExtensionEntries("plugins", scope, cwd).map(({ name }) => ({
    name,
    scope,
    source: "local" as const,
    installed: "n/a",
    latest: "n/a",
    updatable: false,
  }));

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
