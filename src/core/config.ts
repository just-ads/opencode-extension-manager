import * as fs from "node:fs";
import * as path from "node:path";
import { getConfigFilePath, resolveConfigFilePath } from "../utils/paths.js";

/**
 * Strip JSONC comments (// and /* *​/) while preserving strings.
 * Naive regex approaches break on URLs like "https://..." inside strings.
 */
function stripJsoncComments(input: string): string {
  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // String literal — copy verbatim until closing quote
    if (ch === '"') {
      result += ch;
      i++;
      while (i < len) {
        const sc = input[i];
        result += sc;
        i++;
        if (sc === "\\") {
          // escaped char — copy next char too
          if (i < len) {
            result += input[i];
            i++;
          }
        } else if (sc === '"') {
          break;
        }
      }
      continue;
    }

    // Single-line comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "/") {
      // Skip until end of line
      i += 2;
      while (i < len && input[i] !== "\n") {
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && i + 1 < len && input[i + 1] === "*") {
      i += 2;
      while (i + 1 < len && !(input[i] === "*" && input[i + 1] === "/")) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

export interface OpencodeConfig {
  $schema?: string;
  plugin?: string[];
  mcp?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Read opencode.json, returning parsed config or empty default */
export function readConfig(scope?: "global" | "project", cwd?: string): {
  config: OpencodeConfig;
  filePath: string;
  scope: "global" | "project";
} {
  let filePath: string;
  let resolvedScope: "global" | "project";

  if (scope) {
    filePath = getConfigFilePath(scope, cwd);
    resolvedScope = scope;
  } else {
    const resolved = resolveConfigFilePath(cwd);
    filePath = resolved.path;
    resolvedScope = resolved.scope;
  }

  if (!fs.existsSync(filePath)) {
    return {
      config: { $schema: "https://opencode.ai/config.json" },
      filePath,
      scope: resolvedScope,
    };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip JSONC comments while preserving strings (which may contain //)
  const stripped = stripJsoncComments(raw);

  try {
    const config = JSON.parse(stripped) as OpencodeConfig;
    return { config, filePath, scope: resolvedScope };
  } catch {
    throw new Error(`Failed to parse config: ${filePath}`);
  }
}

/** Write config back to opencode.json */
export function writeConfig(
  config: OpencodeConfig,
  filePath: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Add a plugin to the config's plugin array */
export function addPlugin(config: OpencodeConfig, name: string): boolean {
  if (!config.plugin) {
    config.plugin = [];
  }
  if (config.plugin.includes(name)) {
    return false; // already exists
  }
  config.plugin.push(name);
  return true;
}

/** Remove a plugin from the config's plugin array */
export function removePlugin(config: OpencodeConfig, name: string): boolean {
  if (!config.plugin) {
    return false;
  }
  const idx = config.plugin.indexOf(name);
  if (idx === -1) {
    return false;
  }
  config.plugin.splice(idx, 1);
  return true;
}
