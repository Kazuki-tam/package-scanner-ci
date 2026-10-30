import fs from "node:fs";
import { type VulnerabilitySeverityCounts, type VulnerabilitySeverityThreshold } from "../domain/vulnerability.js";
export { countVulnerabilitiesAtOrAboveSeverity, countVulnerabilitiesBySeverity, getVulnerabilitySeverity, normalizeVulnerabilitySeverityThreshold, VULNERABILITY_SEVERITY_ORDER, } from "../domain/vulnerability.js";
export type { VulnerabilitySeverity, VulnerabilitySeverityCounts, VulnerabilitySeverityThreshold, } from "../domain/vulnerability.js";
export declare function writeGitHubOutputs(outputPath: string | undefined, { analysisId, malwareCount, vulnerabilityCount, vulnerabilitySeverityCounts, }: {
    analysisId: string;
    malwareCount: number;
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: VulnerabilitySeverityCounts;
}, { appendFileSync }?: {
    appendFileSync?: typeof fs.appendFileSync;
}): void;
export interface CiAnalyzeSuccessResponse {
    analysisId?: string;
    malware?: unknown[];
    vulnerabilities?: unknown[];
    summary?: {
        total?: number;
        vulnerabilityCount?: number;
    };
}
export interface ParsedCiAnalyzeResult {
    analysisId: string;
    malware: unknown[];
    malwareCount: number;
    vulnerabilities: unknown[];
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: VulnerabilitySeverityCounts;
    totalPackages: number | null;
}
export declare function writeGitHubStepSummary(summaryPath: string | undefined, { analysisId, malwareCount, vulnerabilityCount, vulnerabilitySeverityCounts, totalPackages, failOnMalware, vulnerabilityThreshold, }: {
    analysisId: string;
    malwareCount: number;
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: VulnerabilitySeverityCounts;
    totalPackages: number | null;
    failOnMalware: boolean;
    vulnerabilityThreshold: VulnerabilitySeverityThreshold;
}, { appendFileSync }?: {
    appendFileSync?: typeof fs.appendFileSync;
}): void;
export declare function parseCiAnalyzeSuccessResponse(result: unknown): ParsedCiAnalyzeResult;
//# sourceMappingURL=action-outputs.d.ts.map