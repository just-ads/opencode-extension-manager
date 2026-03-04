import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

/** Resolve opencode config directory paths */
export function getGlobalConfigDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg ?? path.join(os.homedir(), ".config");
  return path.join(base, "opencode");
}

export function getProjectConfigDir(cwd?: string): string {
  return path.join(cwd ?? process.cwd(), ".opencode");
}

/** Resolve opencode cache directory path */
export function getCacheDir(): string {
  const xdg = process.env["XDG_CACHE_HOME"];
  const base = xdg ?? path.join(os.homedir(), ".cache");
  return path.join(base, "opencode");
}

/** Resolve the opencode.json config file path */
export function getConfigFilePath(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") {
    return path.join(getGlobalConfigDir(), "opencode.json");
  }
  // Project scope: check for root-level opencode.json first, then .opencode/opencode.json
  const rootConfig = path.join(cwd ?? process.cwd(), "opencode.json");
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }
  return path.join(getProjectConfigDir(cwd), "opencode.json");
}

/** Find the best config file: project first, then global */
export function resolveConfigFilePath(cwd?: string): { path: string; scope: "project" | "global" } {
  const projectRoot = path.join(cwd ?? process.cwd(), "opencode.json");
  if (fs.existsSync(projectRoot)) {
    return { path: projectRoot, scope: "project" };
  }

  const projectDir = path.join(getProjectConfigDir(cwd), "opencode.json");
  if (fs.existsSync(projectDir)) {
    return { path: projectDir, scope: "project" };
  }

  const globalPath = path.join(getGlobalConfigDir(), "opencode.json");
  if (fs.existsSync(globalPath)) {
    return { path: globalPath, scope: "global" };
  }

  // Default: create at project root
  return { path: projectRoot, scope: "project" };
}

/** Resolve the plugins directory for local file plugins */
export function getPluginsDir(scope: "global" | "project", cwd?: string): string {
  if (scope === "global") {
    return path.join(getGlobalConfigDir(), "plugins");
  }
  return path.join(getProjectConfigDir(cwd), "plugins");
}
