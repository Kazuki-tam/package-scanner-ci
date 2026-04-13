import type { PathFsDeps } from "../support/fs-deps.js";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
/**
 * Single source of truth: lockfile basename → manager, and auto-detect order
 * (first existing file in this order wins).
 */
export declare const LOCKFILE_CANDIDATES: ReadonlyArray<readonly [string, PackageManager]>;
/** Alias for {@link LOCKFILE_CANDIDATES} (same array). */
export declare const LOCKFILE_DETECTION_ORDER: readonly (readonly [string, PackageManager])[];
export declare function inferManagerFromFilename(fileName: string): PackageManager | "";
export declare function detectLockfile(dir: string, { existsSync, pathModule }?: PathFsDeps): {
    relativePath: string;
    manager: PackageManager;
} | null;
//# sourceMappingURL=lockfile.d.ts.map