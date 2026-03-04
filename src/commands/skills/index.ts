import { Command } from "commander";
import { createInfoCommand } from "./info.js";
import { createInstallCommand } from "./install.js";
import { createListCommand } from "./list.js";
import { createUninstallCommand } from "./uninstall.js";
import { createUpdateCommand } from "./update.js";

export function createSkillsCommand(): Command {
  return new Command("skills")
    .description("Manage opencode skills")
    .addCommand(createInstallCommand())
    .addCommand(createUninstallCommand())
    .addCommand(createListCommand())
    .addCommand(createInfoCommand())
    .addCommand(createUpdateCommand());
}
