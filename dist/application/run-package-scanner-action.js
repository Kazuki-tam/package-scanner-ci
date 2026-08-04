import fs from "node:fs";
import path from "node:path";
import { countVulnerabilitiesAtOrAboveSeverity, resolveLockfileInput, resolvePackageJsonInput, resolveWorkingDirectory, normalizeVulnerabilitySeverityThreshold, parseCiAnalyzeSuccessResponse, writeGitHubOutputs, writeGitHubStepSummary, createRequestFailedMessage, createRequestBody, getApiUrl, parseJsonResponseText, } from "../infrastructure/index.js";
export async function runPackageScannerAction({ env = process.env, cwd = process.cwd(), fetchImpl = fetch, fsModule = fs, pathModule = path, } = {}) {
    const workingDirectory = resolveWorkingDirectory(env, cwd, pathModule);
    const readDeps = {
        existsSync: fsModule.existsSync,
        readFileSync: fsModule.readFileSync,
        realpathSync: (filePath) => typeof fsModule.realpathSync.native === "function"
            ? fsModule.realpathSync.native(filePath)
            : fsModule.realpathSync(filePath),
        pathModule,
    };
    const { content: lockfileContent, manager } = resolveLockfileInput(workingDirectory, env, readDeps);
    const packageJsonContent = resolvePackageJsonInput(workingDirectory, env, readDeps);
    const requestBody = createRequestBody({
        lockfileContent,
        manager,
        packageJsonContent,
        enableMetadataCheck: env.PACKAGE_SCANNER_ENABLE_METADATA_CHECK === "true",
    });
    const response = await fetchImpl(getApiUrl(env), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(requestBody),
    });
    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(createRequestFailedMessage(response.status, responseText));
    }
    const result = parseJsonResponseText(responseText);
    const parsed = parseCiAnalyzeSuccessResponse(result);
    const failOnMalware = env.PACKAGE_SCANNER_FAIL_ON_MALWARE !== "false";
    const vulnerabilityThreshold = normalizeVulnerabilitySeverityThreshold(env.PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY);
    const report = {
        analysisId: parsed.analysisId,
        malwareCount: parsed.malwareCount,
        vulnerabilityCount: parsed.vulnerabilityCount,
        vulnerabilitySeverityCounts: parsed.vulnerabilitySeverityCounts,
    };
    const writeDeps = { appendFileSync: fsModule.appendFileSync };
    writeGitHubOutputs(env.GITHUB_OUTPUT, report, writeDeps);
    writeGitHubStepSummary(env.GITHUB_STEP_SUMMARY, { ...report, totalPackages: parsed.totalPackages, failOnMalware, vulnerabilityThreshold }, writeDeps);
    if (failOnMalware && parsed.malwareCount > 0) {
        throw new Error(`PackageScanner: malicious packages detected: ${parsed.malwareCount}`);
    }
    const blockingVulnerabilityCount = countVulnerabilitiesAtOrAboveSeverity(parsed.vulnerabilities, vulnerabilityThreshold);
    if (blockingVulnerabilityCount > 0) {
        throw new Error(`PackageScanner: blocking vulnerabilities detected at or above ${vulnerabilityThreshold}: ${blockingVulnerabilityCount}`);
    }
    return parsed;
}
//# sourceMappingURL=run-package-scanner-action.js.map