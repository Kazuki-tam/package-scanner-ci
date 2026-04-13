import fs from "node:fs";
import path from "node:path";
export interface RunPackageScannerActionResult {
    analysisId: string;
    malware: unknown[];
    malwareCount: number;
    vulnerabilities: unknown[];
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: {
        low: number;
        moderate: number;
        high: number;
        critical: number;
    };
    totalPackages: number | null;
}
export interface RunPackageScannerActionOptions {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    fetchImpl?: typeof fetch;
    fsModule?: typeof fs;
    pathModule?: typeof path;
}
export declare function runPackageScannerAction({ env, cwd, fetchImpl, fsModule, pathModule, }?: RunPackageScannerActionOptions): Promise<RunPackageScannerActionResult>;
//# sourceMappingURL=run-package-scanner-action.d.ts.map