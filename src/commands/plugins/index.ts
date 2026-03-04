import { Command } from "commander";
import { createInfoCommand } from "./info.js";
import { createInstallCommand } from "./install.js";
import { createListCommand } from "./list.js";
import { createUninstallCommand } from "./uninstall.js";
import { createUpdateCommand } from "./update.js";

export function createPluginsCommand(): Command {
  return new Command("plugins")
    .description("Manage opencode plugins")
    .addCommand(createInstallCommand())
    .addCommand(createUninstallCommand())
    .addCommand(createListCommand())
    .addCommand(createInfoCommand())
    .addCommand(createUpdateCommand());
}
