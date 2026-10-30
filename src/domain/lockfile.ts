import fs from "node:fs";
import path from "node:path";

import type { PathFsDeps } from "../support/fs-deps.js";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const PACKAGE_MANAGERS = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
] as const satisfies readonly PackageManager[];

export function normalizePackageManager(value: string | undefined): PackageManager | undefined {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if ((PACKAGE_MANAGERS as readonly string[]).includes(normalized)) {
    return normalized as PackageManager;
  }

  throw new Error("PackageScanner: package-manager must be npm, pnpm, yarn, or bun.");
}

/**
 * Single source of truth: lockfile basename → manager, and auto-detect order
 * (first existing file in this order wins).
 */
export const LOCKFILE_CANDIDATES: ReadonlyArray<readonly [string, PackageManager]> = [
  ["package-lock.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["pnpm-lock.yml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
];

/** Alias for {@link LOCKFILE_CANDIDATES} (same array). */
export const LOCKFILE_DETECTION_ORDER = LOCKFILE_CANDIDATES;

export function inferManagerFromFilename(fileName: string): PackageManager | "" {
  const lower = fileName.toLowerCase();
  for (const [name, manager] of LOCKFILE_CANDIDATES) {
    if (lower === name) {
      return manager;
    }
  }
  return "";
}

export function detectLockfile(
  dir: string,
  { existsSync = fs.existsSync, pathModule = path }: PathFsDeps = {},
): { relativePath: string; manager: PackageManager } | null {
  for (const [fileName, manager] of LOCKFILE_CANDIDATES) {
    if (existsSync(pathModule.join(dir, fileName))) {
      return { relativePath: fileName, manager };
    }
  }
  return null;
}
