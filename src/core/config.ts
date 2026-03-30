import * as fs from "node:fs";
import * as path from "node:path";
import { parse, stringify, type CommentJSONValue } from "comment-json";

import {
  getConfigFiles,
  getGlobalConfigFilePath,
  getProjectConfigFilePath,
  type ExtensionType,
  type ConfigPathSource,
  type ConfigScope,
} from "./paths.js";

const DEFAULT_SCHEMA = "https://opencode.ai/config.json";

export interface OpencodeConfig {
  $schema?: string;
  plugin?: string[];
  plugins?: string[];
  skills?: string[];
  mcps?: string[];
  instructions?: unknown[];
  [key: string]: unknown;
}

function getExtensionConfigKeys(type: ExtensionType): string[] {
  switch (type) {
    case "plugins":
      return ["plugin", "plugins"];
    case "skills":
      return ["skills"];
    case "mcps":
      return ["mcps"];
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function createDefaultConfig(): OpencodeConfig {
  return {
    $schema: DEFAULT_SCHEMA,
    plugin: [],
  };
}

export function normalizeConfig(config: OpencodeConfig): OpencodeConfig {
  const normalized: OpencodeConfig = {
    ...config,
    $schema: typeof config.$schema === "string" && config.$schema.length > 0 ? config.$schema : DEFAULT_SCHEMA,
    plugin: unique([...toStringArray(config.plugin), ...toStringArray(config.plugins)]),
    skills: unique(toStringArray(config.skills)),
    mcps: unique(toStringArray(config.mcps)),
  };

  delete normalized.plugins;
  return normalized;
}

export function getConfiguredExtensionSpecs(config: OpencodeConfig, type: ExtensionType): string[] {
  const keys = getExtensionConfigKeys(type);
  return unique(keys.flatMap((key) => toStringArray(config[key])));
}

function ensureOpencodeConfig(value: CommentJSONValue | undefined): OpencodeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultConfig();
  }

  return normalizeConfig({ ...(value as Record<string, unknown>) });
}

export function loadConfig(filePath: string | undefined): CommentJSONValue | undefined {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const text = fs.readFileSync(filePath, "utf8");
    return parse(text) as CommentJSONValue;
  } catch (error) {
    console.error(`Failed to parse config at ${filePath}:`, error);
    return undefined;
  }
}

export function writeConfig(config: OpencodeConfig, filePath: string | undefined): void {
  if (!filePath) {
    throw new Error("File path is required to write config");
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const normalized = normalizeConfig(config);
  const content = stringify(normalized as unknown as CommentJSONValue, null, 2);
  fs.writeFileSync(filePath, content, "utf8");
}

function getPathBySource(source: ConfigPathSource): string | undefined {
  const target = getConfigFiles().find((configFile) => configFile.source === source);
  return target?.path;
}

export function loadConfigBySource(source: ConfigPathSource): OpencodeConfig {
  const filePath = getPathBySource(source);
  return ensureOpencodeConfig(loadConfig(filePath));
}

export function writeConfigBySource(config: OpencodeConfig, source: ConfigPathSource): void {
  const filePath = getPathBySource(source);
  if (!filePath) {
    throw new Error(`Cannot determine file path for source: ${source}`);
  }

  writeConfig(config, filePath);
}

export function readConfig(scope: ConfigScope, cwd?: string): { config: OpencodeConfig; filePath: string } {
  const filePath = scope === "global" ? getGlobalConfigFilePath() : getProjectConfigFilePath(cwd);
  return {
    config: ensureOpencodeConfig(loadConfig(filePath)),
    filePath,
  };
}

export function resolveOpencodeConfig(): OpencodeConfig {
  const configs = getConfigFiles()
    .map((configFile) => ensureOpencodeConfig(loadConfig(configFile.path)))
    .filter((config) => config !== undefined);

  return configs.reduce<OpencodeConfig>((acc, current) => {
    const merged: OpencodeConfig = {
      ...acc,
      ...current,
      plugin: unique([...toStringArray(acc.plugin), ...toStringArray(current.plugin)]),
    };

    const accInstructions = Array.isArray(acc.instructions) ? acc.instructions : [];
    const currentInstructions = Array.isArray(current.instructions) ? current.instructions : [];
    if (accInstructions.length > 0 || currentInstructions.length > 0) {
      merged.instructions = unique([...accInstructions, ...currentInstructions]);
    }

    return normalizeConfig(merged);
  }, createDefaultConfig());
}
