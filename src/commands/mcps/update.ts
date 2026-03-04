import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createUpdateCommand(): Command {
  return createPlaceholderCommand("mcps", "update", "Update installed MCPs", "up");
}
