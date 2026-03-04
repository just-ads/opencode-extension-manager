import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createListCommand(): Command {
  return createPlaceholderCommand("mcps", "list", "List installed MCPs", "ls");
}
