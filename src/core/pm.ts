import {execSync} from "node:child_process";

export type PackageManager = "bun" | "npm";

/** Detect which package manager is available, preferring bun */
export function detectPM(): PackageManager {
  try {
    execSync("bun --version", {stdio: "ignore"});
    return "bun";
  } catch {
    return "npm";
  }
}

/** Run a package manager command */
export function pmExec(
  pm: PackageManager,
  args: string[],
  cwd?: string
): string {
  const cmd = [pm, ...args].join(" ");
  return execSync(cmd, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Install an npm package */
export function pmInstall(
  pm: PackageManager,
  packageName: string,
  cwd?: string
): string {
  const installCmd = pm === "bun" ? "add" : "install";
  return pmExec(pm, [installCmd, packageName], cwd);
}

/** Uninstall an npm package */
export function pmUninstall(
  pm: PackageManager,
  packageName: string,
  cwd?: string
): string {
  const uninstallCmd = pm === "bun" ? "remove" : "uninstall";
  return pmExec(pm, [uninstallCmd, packageName], cwd);
}

/**
 * Upgrade an npm package
 */
export function pmUpgrade(
  pm: PackageManager,
  packageName: string,
  latest?: boolean,
  cwd?: string
) {
  let upgradeCmd = `update ${packageName}`;
  if (latest) {
    upgradeCmd = pm === 'bun' ? `update ${packageName} --latest` : `install ${packageName}@latest`;
  }
  return pmExec(pm, [upgradeCmd], cwd);
}

/** Get installed package info from npm registry */
export function pmInfo(
  pm: PackageManager,
  packageName: string
): Record<string, unknown> | null {
  const output = pmExec(pm, [
    pm === "bun" ? "pm" : "view",
    ...(pm === "bun" ? ["ls", "--json"] : [packageName, "--json"]),
  ]);
  return JSON.parse(output) as Record<string, unknown>;
}

/** Check for outdated packages */
export function pmOutdated(
  pm: PackageManager,
  cwd?: string
): string {
  return pmExec(pm, ["outdated", "--json"], cwd);
}
