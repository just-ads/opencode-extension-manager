import { Command } from "commander";
import * as fs from "node:fs";
import { getGlobalConfigFilePath, getProjectConfigFilePath } from "../../core/paths.js";
import { writeConfig, type OpencodeConfig } from "../../core/config.js";
import { logger } from "../../utils/logger.js";

export function createInitCommand(): Command {
  return new Command("init")
    .option("-g, --global", "initialize global config")
    .option("--force", "overwrite existing config")
    .description("Initialize an opencode.json config file")
    .action((opts: { global?: boolean; force?: boolean }) => {
      const filePath = opts.global ? getGlobalConfigFilePath() : getProjectConfigFilePath();

      if (fs.existsSync(filePath) && !opts.force) {
        logger.warn(`Config already exists: ${filePath}`);
        logger.dim("Use --force to overwrite.");
        return;
      }

      const config: OpencodeConfig = {
        $schema: "https://opencode.ai/config.json",
        plugin: [],
      };

      writeConfig(config, filePath);
      logger.success(`Created ${filePath}`);
    });
}
