import fs from "node:fs";

export const VULNERABILITY_SEVERITY_ORDER = ["low", "moderate", "high", "critical"] as const;

export type VulnerabilitySeverity = (typeof VULNERABILITY_SEVERITY_ORDER)[number];
export type VulnerabilitySeverityThreshold = VulnerabilitySeverity | "off";
export type VulnerabilitySeverityCounts = Record<VulnerabilitySeverity, number>;

function toSafeGitHubOutputValue(name: string, value: string | number): string {
  const stringValue = String(value);

  if (/[\r\n]/.test(stringValue)) {
    throw new Error(`PackageScanner: unsafe GitHub output for ${name}.`);
  }

  return stringValue;
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

  appendFileSync(outputPath, `analysis-id=${toSafeGitHubOutputValue("analysis-id", analysisId)}\n`);
  appendFileSync(
    outputPath,
    `malware-count=${toSafeGitHubOutputValue("malware-count", malwareCount)}\n`,
  );
  appendFileSync(
    outputPath,
    `vulnerability-count=${toSafeGitHubOutputValue("vulnerability-count", vulnerabilityCount)}\n`,
  );
  appendFileSync(
    outputPath,
    `vulnerability-low-count=${toSafeGitHubOutputValue("vulnerability-low-count", vulnerabilitySeverityCounts.low)}\n`,
  );
  appendFileSync(
    outputPath,
    `vulnerability-moderate-count=${toSafeGitHubOutputValue("vulnerability-moderate-count", vulnerabilitySeverityCounts.moderate)}\n`,
  );
  appendFileSync(
    outputPath,
    `vulnerability-high-count=${toSafeGitHubOutputValue("vulnerability-high-count", vulnerabilitySeverityCounts.high)}\n`,
  );
  appendFileSync(
    outputPath,
    `vulnerability-critical-count=${toSafeGitHubOutputValue("vulnerability-critical-count", vulnerabilitySeverityCounts.critical)}\n`,
  );
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function normalizeSeverityValue(value: string): VulnerabilitySeverity | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "low":
      return "low";
    case "medium":
    case "moderate":
      return "moderate";
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return null;
  }
}

function normalizeCvssScore(score: unknown): VulnerabilitySeverity | null {
  const numericScore =
    typeof score === "number"
      ? score
      : typeof score === "string" && /^\d+(\.\d+)?$/.test(score.trim())
        ? Number(score)
        : Number.NaN;

  if (!Number.isFinite(numericScore) || numericScore <= 0) {
    return null;
  }

  if (numericScore >= 9) {
    return "critical";
  }
  if (numericScore >= 7) {
    return "high";
  }
  if (numericScore >= 4) {
    return "moderate";
  }
  return "low";
}

function getNestedSeverity(
  record: Record<string, unknown>,
  key: string,
): VulnerabilitySeverity | null {
  const nested = asRecord(record[key]);

  if (!nested) {
    return null;
  }

  return (
    normalizeSeverityValue(String(nested.severity ?? "")) ??
    normalizeCvssScore(nested.cvssScore) ??
    normalizeCvssScore(asRecord(nested.cvss)?.score)
  );
}

export function getVulnerabilitySeverity(vulnerability: unknown): VulnerabilitySeverity | null {
  const record = asRecord(vulnerability);

  if (!record) {
    return null;
  }

  const directSeverity = record.severity;

  if (typeof directSeverity === "string") {
    return normalizeSeverityValue(directSeverity);
  }

  if (Array.isArray(directSeverity)) {
    for (const entry of directSeverity) {
      const severityEntry = asRecord(entry);
      const normalized = normalizeCvssScore(severityEntry?.score);

      if (normalized) {
        return normalized;
      }
    }
  }

  return (
    getNestedSeverity(record, "database_specific") ??
    getNestedSeverity(record, "databaseSpecific") ??
    getNestedSeverity(record, "advisory") ??
    normalizeCvssScore(record.cvssScore) ??
    normalizeCvssScore(asRecord(record.cvss)?.score)
  );
}

export function normalizeVulnerabilitySeverityThreshold(
  value: string | undefined,
): VulnerabilitySeverityThreshold {
  const normalized = (value || "high").trim().toLowerCase();

  if (normalized === "off" || normalized === "false" || normalized === "none") {
    return "off";
  }

  const severity = normalizeSeverityValue(normalized);

  if (!severity) {
    throw new Error(
      "PackageScanner: invalid fail-on-vulnerability-severity. Use off, low, moderate, high, or critical.",
    );
  }

  return severity;
}

export function countVulnerabilitiesAtOrAboveSeverity(
  vulnerabilities: unknown[],
  threshold: VulnerabilitySeverityThreshold,
): number {
  if (threshold === "off") {
    return 0;
  }

  const thresholdIndex = VULNERABILITY_SEVERITY_ORDER.indexOf(threshold);

  return vulnerabilities.reduce<number>((count, vulnerability) => {
    const severity = getVulnerabilitySeverity(vulnerability);

    if (!severity) {
      return count;
    }

    return VULNERABILITY_SEVERITY_ORDER.indexOf(severity) >= thresholdIndex ? count + 1 : count;
  }, 0);
}

export function countVulnerabilitiesBySeverity(
  vulnerabilities: unknown[],
): VulnerabilitySeverityCounts {
  const counts: VulnerabilitySeverityCounts = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  for (const vulnerability of vulnerabilities) {
    const severity = getVulnerabilitySeverity(vulnerability);

    if (severity) {
      counts[severity] += 1;
    }
  }

  return counts;
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
    `| Analysis ID | \`${analysisId || "n/a"}\` |`,
    `| Packages scanned | ${totalPackages ?? "unknown"} |`,
    `| Malware findings | ${malwareCount} |`,
    `| Vulnerabilities | ${vulnerabilityCount} |`,
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

export function parseCiAnalyzeSuccessResponse(
  result: CiAnalyzeSuccessResponse,
): ParsedCiAnalyzeResult {
  const malware = result.malware ?? [];
  const malwareCount = malware.length;
  const vulnerabilities = result.vulnerabilities ?? [];
  const vulnerabilitySeverityCounts = countVulnerabilitiesBySeverity(vulnerabilities);
  const vulnerabilityCount =
    typeof result.summary?.vulnerabilityCount === "number"
      ? result.summary.vulnerabilityCount
      : vulnerabilities.length;
  const analysisId = typeof result.analysisId === "string" ? result.analysisId : "";

  return {
    analysisId,
    malware,
    malwareCount,
    vulnerabilities,
    vulnerabilityCount,
    vulnerabilitySeverityCounts,
    totalPackages: result.summary?.total ?? null,
  };
}
