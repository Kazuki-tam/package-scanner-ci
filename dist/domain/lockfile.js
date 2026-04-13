import fs from "node:fs";
import path from "node:path";
/**
 * Single source of truth: lockfile basename → manager, and auto-detect order
 * (first existing file in this order wins).
 */
export const LOCKFILE_CANDIDATES = [
    ["package-lock.json", "npm"],
    ["pnpm-lock.yaml", "pnpm"],
    ["pnpm-lock.yml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
];
/** Alias for {@link LOCKFILE_CANDIDATES} (same array). */
export const LOCKFILE_DETECTION_ORDER = LOCKFILE_CANDIDATES;
export function inferManagerFromFilename(fileName) {
    const lower = fileName.toLowerCase();
    for (const [name, manager] of LOCKFILE_CANDIDATES) {
        if (lower === name) {
            return manager;
        }
    }
    return "";
}
export function detectLockfile(dir, { existsSync = fs.existsSync, pathModule = path } = {}) {
    for (const [fileName, manager] of LOCKFILE_CANDIDATES) {
        if (existsSync(pathModule.join(dir, fileName))) {
            return { relativePath: fileName, manager };
        }
    }
    return null;
}
//# sourceMappingURL=lockfile.js.map