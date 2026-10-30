import fs from "node:fs";
import path from "node:path";
import { type ParsedCiAnalyzeResult } from "../infrastructure/index.js";
export type RunPackageScannerActionResult = ParsedCiAnalyzeResult;
export interface RunPackageScannerActionOptions {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    fetchImpl?: typeof fetch;
    fsModule?: typeof fs;
    pathModule?: typeof path;
    requestTimeoutMs?: number;
}
export declare function runPackageScannerAction({ env, cwd, fetchImpl, fsModule, pathModule, requestTimeoutMs, }?: RunPackageScannerActionOptions): Promise<RunPackageScannerActionResult>;
//# sourceMappingURL=run-package-scanner-action.d.ts.map