/**
 * Public API surface for consumers and tests. Internal implementation is split
 * by responsibility under `domain`, `infrastructure`, `application`, and
 * `support`.
 */
export { LOCKFILE_CANDIDATES, LOCKFILE_DETECTION_ORDER, detectLockfile, inferManagerFromFilename, } from "./domain/lockfile.js";
export { getTrimmedEnv, readFileIfExists, resolveLockfileInput, resolvePackageJsonInput, resolveWorkingDirectory, } from "./infrastructure/action-inputs.js";
export { createRequestFailedMessage, DEFAULT_API_BASE_URL, createRequestBody, getApiUrl, parseJsonResponseText, } from "./infrastructure/ci-api.js";
export { countVulnerabilitiesAtOrAboveSeverity, countVulnerabilitiesBySeverity, getVulnerabilitySeverity, normalizeVulnerabilitySeverityThreshold, parseCiAnalyzeSuccessResponse, VULNERABILITY_SEVERITY_ORDER, writeGitHubOutputs, writeGitHubStepSummary, } from "./infrastructure/action-outputs.js";
export { runPackageScannerAction } from "./application/run-package-scanner-action.js";
//# sourceMappingURL=index.js.map