import { Command } from "commander";
import { collectPlugins, resolveScopes } from "../core/extensions.js";

function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, idx) => {
    return rows.reduce((max, row) => Math.max(max, row[idx].length), header.length);
  });

  const border = `+${widths.map((w) => "-".repeat(w + 2)).join("+")}+`;
  const formatRow = (cells: string[]): string =>
    `| ${cells.map((cell, idx) => cell.padEnd(widths[idx])).join(" | ")} |`;

  console.log(`  ${border}`);
  console.log(`  ${formatRow(headers)}`);
  console.log(`  ${border}`);
  for (const row of rows) {
    console.log(`  ${formatRow(row)}`);
  }
  console.log(`  ${border}`);
}

function printPluginsModule(
  items: Array<{ name: string; scope: string; source: string; installed: string }>
): void {
  console.log("\nplugins:");
  if (items.length === 0) {
    console.log("  (none)");
    return;
  }

  const rows = items.map((item) => [item.name, item.scope, item.source, item.installed]);
  printTable(["Name", "Scope", "Source", "Installed"], rows);
}

function printUnimplementedModule(moduleName: "skills" | "mcps"): void {
  console.log(`\n${moduleName}:`);
  console.log("  not yet realized");
}

export function createListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .option("-g, --global", "list global extensions only")
    .option("-p, --project", "list project extensions only")
    .description("List loaded extensions grouped by module")
    .action((opts: { global?: boolean; project?: boolean }) => {
      try {
        const scopes = resolveScopes(opts);
        const pluginItems = collectPlugins(scopes);

        printPluginsModule(pluginItems);
        printUnimplementedModule("skills");
        printUnimplementedModule("mcps");
        console.log(`\nTotal: ${pluginItems.length} extension(s)\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`✖ List failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
