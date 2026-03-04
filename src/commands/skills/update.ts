import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createUpdateCommand(): Command {
  return createPlaceholderCommand("skills", "update", "Update installed skills", "up");
}
