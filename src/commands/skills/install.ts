import type { Command } from "commander";
import { createPlaceholderCommand } from "../placeholder.js";

export function createInstallCommand(): Command {
  return createPlaceholderCommand("skills", "install", "Install a skill", "i");
}
