import fs from "node:fs";

import {
  countVulnerabilitiesBySeverity,
  VULNERABILITY_SEVERITY_ORDER,
  type VulnerabilitySeverityCounts,
  type VulnerabilitySeverityThreshold,
} from "../domain/vulnerability.js";

export {
  countVulnerabilitiesAtOrAboveSeverity,
  countVulnerabilitiesBySeverity,
  getVulnerabilitySeverity,
  normalizeVulnerabilitySeverityThreshold,
  VULNERABILITY_SEVERITY_ORDER,
} from "../domain/vulnerability.js";
export type {
  VulnerabilitySeverity,
  VulnerabilitySeverityCounts,
  VulnerabilitySeverityThreshold,
} from "../domain/vulnerability.js";

function toSafeGitHubOutputValue(name: string, value: string | number): string {
  const stringValue = String(value);

  if (/[\r\n]/.test(stringValue)) {
    throw new Error(`PackageScanner: unsafe GitHub output for ${name}.`);
  }

  return stringValue;
}

function toSafeGitHubSummaryValue(value: string | number): string {
  return String(value)
    .replace(/\r?\n|\r/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\|/g, "&#124;");
}

export function writeGitHubOutputs(
  outputPath: string | undefined,
  {
    analysisId,
    malwareCount,
    vulnerabilityCount,
    vulnerabilitySeverityCounts,
  }: {
    analysisId: string;
    malwareCount: number;
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: VulnerabilitySeverityCounts;
  },
  { appendFileSync = fs.appendFileSync }: { appendFileSync?: typeof fs.appendFileSync } = {},
): void {
  if (!outputPath) {
    return;
  }

  const entries: Array<[name: string, value: string | number]> = [
    ["analysis-id", analysisId],
    ["malware-count", malwareCount],
    ["vulnerability-count", vulnerabilityCount],
    ...(["unknown", ...VULNERABILITY_SEVERITY_ORDER] as const).map((severity): [string, number] => [
      `vulnerability-${severity}-count`,
      vulnerabilitySeverityCounts[severity],
    ]),
  ];

  for (const [name, value] of entries) {
    appendFileSync(outputPath, `${name}=${toSafeGitHubOutputValue(name, value)}\n`);
  }
}

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

function asResponseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("PackageScanner: response JSON must be an object.");
  }

  return value as Record<string, unknown>;
}

function readArray(value: unknown, field: string): unknown[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`PackageScanner: response field ${field} must be an array.`);
  }

  return value;
}

function readNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }

  return value;
}

export function writeGitHubStepSummary(
  summaryPath: string | undefined,
  {
    analysisId,
    malwareCount,
    vulnerabilityCount,
    vulnerabilitySeverityCounts,
    totalPackages,
    failOnMalware,
    vulnerabilityThreshold,
  }: {
    analysisId: string;
    malwareCount: number;
    vulnerabilityCount: number;
    vulnerabilitySeverityCounts: VulnerabilitySeverityCounts;
    totalPackages: number | null;
    failOnMalware: boolean;
    vulnerabilityThreshold: VulnerabilitySeverityThreshold;
  },
  { appendFileSync = fs.appendFileSync }: { appendFileSync?: typeof fs.appendFileSync } = {},
): void {
  if (!summaryPath) {
    return;
  }

  const lines = [
    "## PackageScanner summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Analysis ID | <code>${toSafeGitHubSummaryValue(analysisId || "n/a")}</code> |`,
    `| Packages scanned | ${totalPackages ?? "unknown"} |`,
    `| Malware findings | ${malwareCount} |`,
    `| Vulnerabilities | ${vulnerabilityCount} |`,
    `| Unknown | ${vulnerabilitySeverityCounts.unknown} |`,
    `| Low | ${vulnerabilitySeverityCounts.low} |`,
    `| Moderate | ${vulnerabilitySeverityCounts.moderate} |`,
    `| High | ${vulnerabilitySeverityCounts.high} |`,
    `| Critical | ${vulnerabilitySeverityCounts.critical} |`,
    "",
    `Blocking policy: malware ${failOnMalware ? "enabled" : "disabled"}, vulnerabilities at or above \`${vulnerabilityThreshold}\`.`,
    "",
  ];

  appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

export function parseCiAnalyzeSuccessResponse(result: unknown): ParsedCiAnalyzeResult {
  const record = asResponseRecord(result);
  const summary = asOptionalRecord(record.summary);
  const malware = readArray(record.malware, "malware");
  const vulnerabilities = readArray(record.vulnerabilities, "vulnerabilities");
  const vulnerabilitySeverityCounts = countVulnerabilitiesBySeverity(vulnerabilities);
  const vulnerabilityCount =
    readNonNegativeInteger(summary?.vulnerabilityCount) ?? vulnerabilities.length;
  const analysisId = typeof record.analysisId === "string" ? record.analysisId : "";

  return {
    analysisId,
    malware,
    malwareCount: malware.length,
    vulnerabilities,
    vulnerabilityCount,
    vulnerabilitySeverityCounts,
    totalPackages: readNonNegativeInteger(summary?.total) ?? null,
  };
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("PackageScanner: response field summary must be an object.");
  }

  return value as Record<string, unknown>;
}
