import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { readConfig, writeConfig, removePlugin } from "../../core/config.js";
import { detectPM, pmUninstall } from "../../core/pm.js";
import { getPluginsDir, getCacheDir } from "../../utils/paths.js";
import { extractPackageName } from "../../utils/package.js";
import { logger } from "../../utils/logger.js";

export function createUninstallCommand(): Command {
  return new Command("uninstall")
    .alias("rm")
    .argument("<name>", "plugin name to remove")
    .option("-g, --global", "remove from global config")
    .option("-p, --project", "remove from project config (default)")
    .option("--dry-run", "preview changes without executing")
    .description("Uninstall an opencode plugin")
    .action(async (name: string, opts: { global?: boolean; dryRun?: boolean }) => {
      const scope = opts.global ? "global" : "project";

      try {
        const { config, filePath } = readConfig(scope);
        const bareName = extractPackageName(name);
        const configEntry = config.plugin?.find((p) => extractPackageName(p) === bareName);
        const inConfig = Boolean(configEntry);

        const pluginsDir = getPluginsDir(scope);
        const localCandidates = [name, `${name}.ts`, `${name}.js`];
        let localPath: string | null = null;

        for (const candidate of localCandidates) {
          const p = path.join(pluginsDir, candidate);
          if (fs.existsSync(p)) {
            localPath = p;
            break;
          }
        }

        if (!inConfig && !localPath) {
          logger.error(`Plugin "${name}" is not installed.`);
          process.exitCode = 1;
          return;
        }

        if (opts.dryRun) {
          logger.dim("[dry-run] Would perform the following:");
          if (inConfig) {
            logger.dim(`  1. Remove "${configEntry}" from plugin array in ${filePath}`);
            logger.dim(`  2. Run package manager uninstall for "${bareName}"`);
          }
          if (localPath) {
            logger.dim(`  1. Delete local plugin file: ${localPath}`);
          }
          return;
        }

        if (inConfig && configEntry) {
          removePlugin(config, configEntry);
          writeConfig(config, filePath);
          logger.dim(`Updated ${filePath}`);

          try {
            const pm = detectPM();
            const cacheDir = getCacheDir();
            fs.mkdirSync(cacheDir, { recursive: true });
            logger.dim(`Using ${pm} to uninstall "${bareName}"...`);
            pmUninstall(pm, bareName, cacheDir);
          } catch {
            logger.warn(
              `Package manager uninstall failed for "${bareName}" (may not be an npm package)`
            );
          }
        }

        if (localPath) {
          const stat = fs.statSync(localPath);
          if (stat.isDirectory()) {
            fs.rmSync(localPath, { recursive: true });
          } else {
            fs.unlinkSync(localPath);
          }
          logger.dim(`Deleted ${localPath}`);
        }

        logger.success(`Uninstalled plugin "${name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Uninstall failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
