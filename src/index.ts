#!/usr/bin/env node

import { Command } from "commander";
import { createListCommand } from "./commands/list.js";
import { createMcpsCommand } from "./commands/mcps/index.js";
import { createPluginsCommand } from "./commands/plugins/index.js";
import { createSkillsCommand } from "./commands/skills/index.js";

const program = new Command();

program
  .name("oem")
  .description("OpenCode extension manager")
  .version("0.1.0");

program.addCommand(createListCommand());
program.addCommand(createPluginsCommand());
program.addCommand(createSkillsCommand());
program.addCommand(createMcpsCommand());

program.parse();
