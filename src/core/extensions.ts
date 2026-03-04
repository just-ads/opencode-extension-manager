import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { extractPackageName } from "../utils/package.js";
import { getCacheDir, getPluginsDir } from "../utils/paths.js";
import { readConfig } from "./config.js";

export type Scope = "global" | "project";

export interface PluginListItem {
  name: string;
  scope: Scope;
  source: "npm" | "local";
  installed: string;
  latest: string;
  updatable: boolean;
}

interface LoosePluginConfig {
  plugin?: unknown;
  plugins?: unknown;
}

function isLocalPluginSpecifier(input: string): boolean {
  return (
    input.startsWith("file://") ||
    input.startsWith(".") ||
    input.startsWith("/") ||
    input.startsWith("~") ||
    /^[A-Za-z]:[\\/]/.test(input)
  );
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
    // continue to npm ls fallback
  }

  try {
    const output = execSync(`npm ls ${bareName} --json --depth=0 2>nul`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      cwd: cacheDir,
    });
    const data = JSON.parse(output) as {
      dependencies?: Record<string, { version?: string }>;
    };
    return data.dependencies?.[bareName]?.version ?? "n/a";
  } catch {
    return "n/a";
  }
}

function getLatestPluginVersion(packageName: string): string {
  const bareName = extractPackageName(packageName);
  try {
    const output = execSync(`npm view ${bareName} version 2>nul`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim() || "n/a";
  } catch {
    return "n/a";
  }
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
    if (isLocalPluginSpecifier(spec)) {
      const localSpec = spec.replace(/^file:\/\//, "");
      return {
        name: path.basename(localSpec),
        scope,
        source: "local" as const,
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
      source: "npm" as const,
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
