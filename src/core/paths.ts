import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type ConfigPathSource = "well-known" | "global" | "custom" | "project" | "inline";
export type ConfigScope = "global" | "project";
export type ExtensionType = "plugins" | "skills" | "mcps";

export interface ConfigPath {
  path: string;
  source: ConfigPathSource;
}

function resolveConfigFileForDir(dirPath: string): string {
  const json = path.join(dirPath, "opencode.json");
  const jsonc = path.join(dirPath, "opencode.jsonc");
  return fs.existsSync(jsonc) ? jsonc : json;
}

export function getConfigFilePath(dirPath: string): string {
  return resolveConfigFileForDir(dirPath);
}

export function getWellKnownConfigDir(): string {
  return path.join(os.homedir(), ".well-known", "opencode");
}

export function getGlobalConfigDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg ?? path.join(os.homedir(), ".config");
  return path.join(base, "opencode");
}

export function getCustomConfigDir(): string | undefined {
  return process.env["OPENCODE_CONFIG_DIR"];
}

export function getProjectConfigDir(cwd?: string): string {
  return path.join(cwd ?? process.cwd(), ".opencode");
}

export function getWellKnownConfigFilePath(): string {
  return getConfigFilePath(getWellKnownConfigDir());
}

export function getGlobalConfigFilePath(): string {
  return getConfigFilePath(getGlobalConfigDir());
}

export function getCustomConfigFilePath(): string | undefined {
  return process.env["OPENCODE_CONFIG"];
}

export function getProjectConfigFilePath(cwd?: string): string {
  const rootConfig = path.join(cwd ?? process.cwd(), "opencode.json");
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }

  return path.join(getProjectConfigDir(cwd), "opencode.json");
}

export function getInlineConfigFilePath(): string | undefined {
  return process.env["OPENCODE_CONFIG_CONTENT"];
}

export function getPluginsDir(scope: ConfigScope, cwd?: string): string {
  return getExtensionDir("plugins", scope, cwd);
}

export function getExtensionDir(type: ExtensionType, scope: ConfigScope, cwd?: string): string {
  if (scope === "global") {
    return path.join(getGlobalConfigDir(), type);
  }

  return path.join(getProjectConfigDir(cwd), type);
}

export function getExtensionDirFromConfigDir(dirPath: string, type: ExtensionType): string {
  return path.join(dirPath, type);
}

export function getCacheDir(): string {
  const xdg = process.env["XDG_CACHE_HOME"];
  const base = xdg ?? path.join(os.homedir(), ".cache");
  return path.join(base, "opencode");
}

export function getConfigFiles(cwd?: string): ConfigPath[] {
  const customConfigFilePath = getCustomConfigFilePath();
  const inlineConfigFilePath = getInlineConfigFilePath();
  const candidates: Array<ConfigPath | undefined> = [
    {path: getWellKnownConfigFilePath(), source: "well-known"},
    {path: getGlobalConfigFilePath(), source: "global"},
    customConfigFilePath ? {path: customConfigFilePath, source: "custom"} : undefined,
    {path: getProjectConfigFilePath(cwd), source: "project"},
    inlineConfigFilePath ? {path: inlineConfigFilePath, source: "inline"} : undefined,
  ];

  return candidates.filter((candidate): candidate is ConfigPath => candidate !== undefined);
}

export function getConfigDir(cwd?: string): ConfigPath[] {
  const customConfigDir = getCustomConfigDir()
  const candidates: Array<ConfigPath | undefined> = [
    {path: getWellKnownConfigDir(), source: "well-known"},
    {path: getGlobalConfigDir(), source: "global"},
    customConfigDir ? {path: customConfigDir, source: "custom"} : undefined,
    {path: getProjectConfigDir(cwd), source: "project"},
  ];

  return candidates.filter((candidate): candidate is ConfigPath => candidate !== undefined);
}
