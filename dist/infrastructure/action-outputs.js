import fs from "node:fs";
import { countVulnerabilitiesBySeverity, VULNERABILITY_SEVERITY_ORDER, } from "../domain/vulnerability.js";
export { countVulnerabilitiesAtOrAboveSeverity, countVulnerabilitiesBySeverity, getVulnerabilitySeverity, normalizeVulnerabilitySeverityThreshold, VULNERABILITY_SEVERITY_ORDER, } from "../domain/vulnerability.js";
function toSafeGitHubOutputValue(name, value) {
    const stringValue = String(value);
    if (/[\r\n]/.test(stringValue)) {
        throw new Error(`PackageScanner: unsafe GitHub output for ${name}.`);
    }
    return stringValue;
}
function toSafeGitHubSummaryValue(value) {
    return String(value)
        .replace(/\r?\n|\r/g, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\|/g, "&#124;");
}
export function writeGitHubOutputs(outputPath, { analysisId, malwareCount, vulnerabilityCount, vulnerabilitySeverityCounts, }, { appendFileSync = fs.appendFileSync } = {}) {
    if (!outputPath) {
        return;
    }
    const entries = [
        ["analysis-id", analysisId],
        ["malware-count", malwareCount],
        ["vulnerability-count", vulnerabilityCount],
        ...["unknown", ...VULNERABILITY_SEVERITY_ORDER].map((severity) => [
            `vulnerability-${severity}-count`,
            vulnerabilitySeverityCounts[severity],
        ]),
    ];
    for (const [name, value] of entries) {
        appendFileSync(outputPath, `${name}=${toSafeGitHubOutputValue(name, value)}\n`);
    }
}
function asResponseRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("PackageScanner: response JSON must be an object.");
    }
    return value;
}
function readArray(value, field) {
    if (value == null) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error(`PackageScanner: response field ${field} must be an array.`);
    }
    return value;
}
function readNonNegativeInteger(value) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        return undefined;
    }
    return value;
}
export function writeGitHubStepSummary(summaryPath, { analysisId, malwareCount, vulnerabilityCount, vulnerabilitySeverityCounts, totalPackages, failOnMalware, vulnerabilityThreshold, }, { appendFileSync = fs.appendFileSync } = {}) {
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
export function parseCiAnalyzeSuccessResponse(result) {
    const record = asResponseRecord(result);
    const summary = asOptionalRecord(record.summary);
    const malware = readArray(record.malware, "malware");
    const vulnerabilities = readArray(record.vulnerabilities, "vulnerabilities");
    const vulnerabilitySeverityCounts = countVulnerabilitiesBySeverity(vulnerabilities);
    const vulnerabilityCount = readNonNegativeInteger(summary?.vulnerabilityCount) ?? vulnerabilities.length;
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
function asOptionalRecord(value) {
    if (value == null) {
        return undefined;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("PackageScanner: response field summary must be an object.");
    }
    return value;
}
//# sourceMappingURL=action-outputs.js.map