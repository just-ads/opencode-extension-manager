import type { ConfigPathSource, ConfigScope } from "./paths.js";

export type Scope = ConfigScope;

export function scopeFromSource(source: ConfigPathSource): Scope {
  return source === "well-known" || source === "global" ? "global" : "project";
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
