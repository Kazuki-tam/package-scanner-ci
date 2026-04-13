import fs from "node:fs";
export declare const VULNERABILITY_SEVERITY_ORDER: readonly ["low", "moderate", "high", "critical"];
export type VulnerabilitySeverity = (typeof VULNERABILITY_SEVERITY_ORDER)[number];
export type VulnerabilitySeverityThreshold = VulnerabilitySeverity | "off";
export type VulnerabilitySeverityCounts = Record<VulnerabilitySeverity, number>;
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
export declare function getVulnerabilitySeverity(vulnerability: unknown): VulnerabilitySeverity | null;
export declare function normalizeVulnerabilitySeverityThreshold(value: string | undefined): VulnerabilitySeverityThreshold;
export declare function countVulnerabilitiesAtOrAboveSeverity(vulnerabilities: unknown[], threshold: VulnerabilitySeverityThreshold): number;
export declare function countVulnerabilitiesBySeverity(vulnerabilities: unknown[]): VulnerabilitySeverityCounts;
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
export declare function parseCiAnalyzeSuccessResponse(result: CiAnalyzeSuccessResponse): ParsedCiAnalyzeResult;
//# sourceMappingURL=action-outputs.d.ts.map