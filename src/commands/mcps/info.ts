import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createInfoCommand(): Command {
  return createPlaceholderCommand("mcps", "info", "Show MCP details");
}
