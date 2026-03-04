import { Command } from "commander";
import { logger } from "../utils/logger.js";

export function createPlaceholderCommand(
  moduleName: string,
  commandName: string,
  description: string,
  alias?: string
): Command {
  const command = new Command(commandName)
    .description(description)
    .action(() => {
      logger.info(`${moduleName} ${commandName}：not yet realized`);
    });

  if (alias) {
    command.alias(alias);
  }

  return command;
}
