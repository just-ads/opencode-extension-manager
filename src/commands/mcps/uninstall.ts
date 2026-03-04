import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createUninstallCommand(): Command {
  return createPlaceholderCommand("mcps", "uninstall", "Uninstall an MCP", "rm");
}
