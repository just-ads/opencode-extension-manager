import { Command } from "commander";
import * as fs from "node:fs";
import { readConfig } from "../../core/config.js";
import { detectPM, pmExec } from "../../core/pm.js";
import { getCacheDir } from "../../utils/paths.js";
import { extractPackageName } from "../../utils/package.js";
import { logger } from "../../utils/logger.js";

function isLocalPluginSpecifier(input: string): boolean {
  return (
    input.startsWith("file://") ||
    input.startsWith(".") ||
    input.startsWith("/") ||
    input.startsWith("~") ||
    /^[A-Za-z]:[\\/]/.test(input)
  );
}

export function createUpdateCommand(): Command {
  return new Command("update")
    .alias("up")
    .argument("[name]", "specific plugin to update (default: all)")
    .option("-g, --global", "update global plugins")
    .option("-p, --project", "update project plugins (default)")
    .option("--dry-run", "preview changes without executing")
    .description("Update installed plugins")
    .action((name: string | undefined, opts: { global?: boolean; dryRun?: boolean }) => {
      const scope = opts.global ? "global" : "project";

      try {
        const { config } = readConfig(scope);
        const plugins = (config.plugin ?? []).filter((p) => !isLocalPluginSpecifier(p));

        if (plugins.length === 0) {
          logger.info("No npm plugins installed to update.");
          return;
        }

        const target = name ? extractPackageName(name) : undefined;
        const toUpdate = target ? plugins.filter((p) => extractPackageName(p) === target) : plugins;

        if (name && toUpdate.length === 0) {
          logger.error(`Plugin "${name}" is not installed. Use \`oem plugins list\` to see installed plugins.`);
          process.exitCode = 1;
          return;
        }

        const pm = detectPM();
        const cacheDir = getCacheDir();
        fs.mkdirSync(cacheDir, { recursive: true });

        for (const plugin of toUpdate) {
          const pkgName = extractPackageName(plugin);
          if (opts.dryRun) {
            logger.dim(`[dry-run] Would update "${pkgName}" via ${pm}`);
            continue;
          }

          logger.info(`Updating "${pkgName}"...`);
          try {
            pmExec(pm, ["update", pkgName], cacheDir);
            logger.success(`Updated "${pkgName}"`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`Failed to update "${pkgName}": ${msg}`);
          }
        }

        if (!opts.dryRun) {
          logger.success(`Update complete. ${toUpdate.length} plugin(s) processed.`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Update failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
