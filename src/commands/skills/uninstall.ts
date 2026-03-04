import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createUninstallCommand(): Command {
  return createPlaceholderCommand("skills", "uninstall", "Uninstall a skill", "rm");
}
