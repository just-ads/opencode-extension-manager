import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createInstallCommand(): Command {
  return createPlaceholderCommand("mcps", "install", "Install an MCP", "i");
}
