import { Command } from "commander";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { readConfig } from "../../core/config.js";
import { extractPackageName } from "../../utils/package.js";
import { getCacheDir } from "../../utils/paths.js";
import { logger } from "../../utils/logger.js";

type Scope = "global" | "project";

function fetchNpmInfo(packageName: string): Record<string, unknown> | null {
  try {
    const output = execSync(`npm view ${packageName} --json`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(output) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getInstalledVersionFromCache(packageName: string): string | null {
  const bareName = extractPackageName(packageName);
  const pkgPath = path.join(getCacheDir(), "node_modules", bareName, "package.json");
  try {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function checkInstalled(name: string, scope: Scope): boolean {
  try {
    const { config } = readConfig(scope);
    const bareName = extractPackageName(name);
    return config.plugin?.some((p) => extractPackageName(p) === bareName) ?? false;
  } catch {
    return false;
  }
}

export function createInfoCommand(): Command {
  return new Command("info")
    .argument("<name>", "plugin name")
    .option("-g, --global", "check global scope only")
    .option("-p, --project", "check project scope only")
    .option("--json", "output as JSON")
    .description("Show details about an opencode plugin")
    .action((name: string, opts: { global?: boolean; project?: boolean; json?: boolean }) => {
      try {
        const scopes: Scope[] = opts.global ? ["global"] : opts.project ? ["project"] : ["project", "global"];
        const installedIn: Scope[] = scopes.filter((s) => checkInstalled(name, s));
        const installedVersion = getInstalledVersionFromCache(name);
        const npmInfo = fetchNpmInfo(name);

        if (!npmInfo && installedIn.length === 0 && !installedVersion) {
          logger.error(`Plugin "${name}" not found in npm registry or local config.`);
          process.exitCode = 1;
          return;
        }

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                installed: installedIn.length > 0 || installedVersion !== null,
                scopes: installedIn,
                installedVersion,
                npm: npmInfo,
              },
              null,
              2
            )
          );
          return;
        }

        console.log();
        if (npmInfo) {
          const fields: [string, unknown][] = [
            ["Name", npmInfo["name"]],
            ["Version", npmInfo["version"]],
            ["Description", npmInfo["description"]],
            ["License", npmInfo["license"]],
            ["Homepage", npmInfo["homepage"]],
            [
              "Repository",
              typeof npmInfo["repository"] === "object"
                ? (npmInfo["repository"] as Record<string, unknown>)?.["url"]
                : npmInfo["repository"],
            ],
          ];

          for (const [label, value] of fields) {
            if (value) {
              console.log(`  ${label.padEnd(14)} ${value}`);
            }
          }

          const keywords = npmInfo["keywords"];
          if (Array.isArray(keywords) && keywords.length > 0) {
            console.log(`  ${"Keywords".padEnd(14)} ${keywords.join(", ")}`);
          }
        }

        if (installedIn.length > 0 || installedVersion) {
          const parts: string[] = [];
          if (installedIn.length > 0) {
            parts.push(installedIn.join(", "));
          }
          if (installedVersion) {
            parts.push(`cache version: ${installedVersion}`);
          }
          console.log(`  ${"Installed".padEnd(14)} Yes (${parts.join("; ")})`);
        } else {
          console.log(`  ${"Installed".padEnd(14)} No`);
        }
        console.log();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Info failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
