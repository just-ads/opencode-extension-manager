import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createListCommand(): Command {
  return createPlaceholderCommand("skills", "list", "List installed skills", "ls");
}
