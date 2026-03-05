import * as fs from "node:fs";
import * as path from "node:path";

export type PluginSource = "npm" | "git" | "local";

export interface ResolvedPluginSource {
  type: PluginSource;
  value: string;
}

interface DetectPluginSourceOptions {
  includePathExistence?: boolean;
}

export function isLocalPluginSpecifier(input: string): boolean {
  return (
    input.startsWith("file://") ||
    input.startsWith(".") ||
    input.startsWith("/") ||
    input.startsWith("~") ||
    /^[A-Za-z]:[\\/]/.test(input)
  );
}

export function isGitPluginSpecifier(input: string): boolean {
  return (
    input.startsWith("git+") ||
    input.startsWith("git://") ||
    input.startsWith("https://github.com/") ||
    input.startsWith("git@") ||
    input.endsWith(".git")
  );
}

export function detectPluginSource(
  input: string,
  opts: DetectPluginSourceOptions = {},
): PluginSource {
  if (isLocalPluginSpecifier(input) || (opts.includePathExistence === true && fs.existsSync(input))) {
    return "local";
  }

  if (isGitPluginSpecifier(input)) {
    return "git";
  }

  return "npm";
}

export function resolvePluginSource(input: string): ResolvedPluginSource {
  const sourceType = detectPluginSource(input, { includePathExistence: true });
  if (sourceType === "local") {
    return { type: "local", value: path.resolve(input) };
  }

  return { type: sourceType, value: input };
}
