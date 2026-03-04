import chalk from "chalk";

export const logger = {
  info(msg: string) {
    console.log(chalk.blue("ℹ"), msg);
  },
  success(msg: string) {
    console.log(chalk.green("✓"), msg);
  },
  warn(msg: string) {
    console.log(chalk.yellow("⚠"), msg);
  },
  error(msg: string) {
    console.error(chalk.red("✗"), msg);
  },
  dim(msg: string) {
    console.log(chalk.dim(msg));
  },
  table(rows: string[][]) {
    const colWidths = rows[0].map((_, colIdx) =>
      Math.max(...rows.map((row) => (row[colIdx] ?? "").length))
    );
    for (const row of rows) {
      const line = row
        .map((cell, i) => cell.padEnd(colWidths[i] + 2))
        .join("");
      console.log("  " + line);
    }
  },
};
