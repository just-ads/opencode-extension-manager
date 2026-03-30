import { Command } from "commander";
import { collectPlugins, type PluginListItem } from "../../core/plugin.js";
import { resolveScopes } from "../../core/scopes.js";
import { logger } from "../../utils/logger.js";

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

function toRows(items: PluginListItem[]): string[][] {
  return items.map((item) => [
    item.name,
    item.scope,
    item.source,
    item.installed,
    item.latest,
    item.updatable ? "updatable" : item.source === "local" ? "local" : "ok",
  ]);
}

export function createListCommand(): Command {
  return new Command("list")
    .alias("ls")
    .option("-g, --global", "list global plugins only")
    .option("-p, --project", "list project plugins only")
    .option("--json", "output as JSON")
    .description("List installed opencode plugins")
    .action((opts: { global?: boolean; project?: boolean; json?: boolean }) => {
      try {
        const scopes = resolveScopes(opts);
        const items = collectPlugins(scopes);

        if (opts.json) {
          console.log(JSON.stringify(items, null, 2));
          return;
        }

        if (items.length === 0) {
          logger.info("No plugins installed.");
          return;
        }

        console.log();
        printTable(["Name", "Scope", "Type", "Installed", "Latest", "Status"], toRows(items));
        console.log(`\n  Total: ${items.length} plugin(s)\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`List failed: ${msg}`);
        process.exitCode = 1;
      }
    });
}
