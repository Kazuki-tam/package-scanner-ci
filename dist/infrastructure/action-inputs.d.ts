import path from "node:path";
import type { PathFsDeps } from "../support/fs-deps.js";
export declare function getTrimmedEnv(env: NodeJS.ProcessEnv, name: string): string;
export declare function readFileIfExists(filePath: string, { existsSync, readFileSync }?: PathFsDeps): string | undefined;
export interface ResolveLockfileInputResult {
    content: string | undefined;
    /** Resolved manager (env override, auto-detect, or inferred from filename). */
    manager: string | undefined;
}
export declare function resolveLockfileInput(dir: string, env: NodeJS.ProcessEnv, { existsSync, readFileSync, realpathSync, pathModule, }?: PathFsDeps): ResolveLockfileInputResult;
export declare function resolvePackageJsonInput(dir: string, env: NodeJS.ProcessEnv, { existsSync, readFileSync, realpathSync, pathModule, }?: PathFsDeps): string | undefined;
export declare function resolveWorkingDirectory(env: NodeJS.ProcessEnv, cwd: string, pathModule: typeof path): string;
//# sourceMappingURL=action-inputs.d.ts.map