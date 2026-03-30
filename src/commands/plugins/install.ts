import { Command } from "commander";
import * as fs from "node:fs";
import { readConfig, writeConfig } from "../../core/config.js";
import { detectPM, pmInstall } from "../../core/pm.js";
import { addPlugin, findPluginEntry, installLocalPlugin } from "../../core/plugin.js";
import { getCacheDir, getPluginsDir } from "../../core/paths.js";
import { logger } from "../../utils/logger.js";
import { extractPackageName } from "../../utils/package.js";
import { resolvePluginSource } from "../../utils/plugin-source.js";

export function createInstallCommand(): Command {
  return new Command("install")
    .alias("i")
    .argument("<source>", "npm package name, git URL, or local path")
    .option("-g, --global", "install to global config")
    .option("-p, --project", "install to project config (default)")
    .option("--dry-run", "preview changes without executing")
    .description("Install an opencode plugin")
    .action(async (source: string, opts: { global?: boolean; dryRun?: boolean }) => {
      const scope = opts.global ? "global" : "project";
      const resolved = resolvePluginSource(source);

      logger.info(`Installing plugin from ${resolved.type} source: ${resolved.value}`);

      if (opts.dryRun) {
        logger.dim("[dry-run] Would perform the following:");
      }

      try {
        const { config, filePath } = readConfig(scope);

        if (resolved.type === "npm" || resolved.type === "git") {
          const packageName = resolved.value;
          const configName = extractPackageName(packageName);
          const existingEntry = findPluginEntry(config, configName);

          if (existingEntry) {
            logger.warn(`Plugin "${configName}" is already installed as "${existingEntry}".`);
            return;
          }

          if (opts.dryRun) {
            logger.dim(`  1. Add "${configName}" to plugin array in ${filePath}`);
            logger.dim(`  2. Run package manager install for "${packageName}"`);
            return;
          }

          addPlugin(config, packageName);
          writeConfig(config, filePath);
          logger.dim(`Updated ${filePath}`);

          const pm = detectPM();
          fs.mkdirSync(getCacheDir(), { recursive: true });
          logger.dim(`Using ${pm} to install "${packageName}"...`);
          pmInstall(pm, packageName, getCacheDir());

          logger.success(`Installed plugin "${configName}" (${resolved.type})`);
          return;
        }

        if (!fs.existsSync(resolved.value)) {
          logger.error(`Source not found: ${resolved.value}`);
          process.exitCode = 1;
          return;
        }

        if (opts.dryRun) {
          logger.dim(`  1. Copy "${resolved.value}" to plugins directory`);
          return;
        }

        const installedName = installLocalPlugin(resolved.value, scope);
        logger.success(`Installed local plugin "${installedName}" to ${getPluginsDir(scope)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Install failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
