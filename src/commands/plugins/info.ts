import { Command } from "commander";
import { collectPlugins, fetchPluginPackageInfo, getInstalledPluginVersion } from "../../core/plugin.js";
import { resolveScopes, type Scope } from "../../core/scopes.js";
import { extractPackageName } from "../../utils/package.js";
import { logger } from "../../utils/logger.js";

function uniqueScopes(items: Scope[]): Scope[] {
  return [...new Set(items)];
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
        const bareName = extractPackageName(name);
        const scopes = resolveScopes(opts) as Scope[];
        const installedItems = collectPlugins(scopes).filter((item) => item.name === bareName || item.name === name);
        const installedIn = uniqueScopes(installedItems.map((item) => item.scope as Scope));
        const installedVersion = getInstalledPluginVersion(bareName);
        const packageInfo = fetchPluginPackageInfo(bareName);

        if (!packageInfo && installedItems.length === 0 && installedVersion === null) {
          logger.error(`Plugin "${name}" not found in npm registry or local config.`);
          process.exitCode = 1;
          return;
        }

        if (opts.json) {
          console.log(JSON.stringify({
            name: bareName,
            installed: installedItems.length > 0 || installedVersion !== null,
            scopes: installedIn,
            installedVersion,
            latestVersion: installedItems.find((item) => item.latest !== "n/a")?.latest ?? null,
            npm: packageInfo,
          }, null, 2));
          return;
        }

        console.log();
        if (packageInfo) {
          const fields: Array<[string, unknown]> = [
            ["Name", packageInfo["name"]],
            ["Version", packageInfo["version"]],
            ["Description", packageInfo["description"]],
            ["License", packageInfo["license"]],
            ["Homepage", packageInfo["homepage"]],
            [
              "Repository",
              typeof packageInfo["repository"] === "object"
                ? (packageInfo["repository"] as Record<string, unknown>)["url"]
                : packageInfo["repository"],
            ],
          ];

          for (const [label, value] of fields) {
            if (value) {
              console.log(`  ${label.padEnd(14)} ${value}`);
            }
          }

          const keywords = packageInfo["keywords"];
          if (Array.isArray(keywords) && keywords.length > 0) {
            console.log(`  ${"Keywords".padEnd(14)} ${keywords.join(", ")}`);
          }
        }

        if (installedItems.length > 0 || installedVersion) {
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
