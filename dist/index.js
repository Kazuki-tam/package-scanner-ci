/**
 * Public API surface for consumers and tests. Internal implementation is split
 * by responsibility under `domain`, `infrastructure`, `application`, and
 * `support`.
 */
export { LOCKFILE_CANDIDATES, LOCKFILE_DETECTION_ORDER, detectLockfile, inferManagerFromFilename, normalizePackageManager, } from "./domain/lockfile.js";
export { getTrimmedEnv, readFileIfExists, resolveLockfileInput, resolvePackageJsonInput, resolveWorkingDirectory, } from "./infrastructure/action-inputs.js";
export { ANALYZE_REQUEST_TIMEOUT_MS, createRequestFailedMessage, DEFAULT_API_BASE_URL, createRequestBody, getApiUrl, parseJsonResponseText, postAnalyzeRequest, } from "./infrastructure/ci-api.js";
export { countVulnerabilitiesAtOrAboveSeverity, countVulnerabilitiesBySeverity, getVulnerabilitySeverity, normalizeVulnerabilitySeverityThreshold, parseCiAnalyzeSuccessResponse, VULNERABILITY_SEVERITY_ORDER, writeGitHubOutputs, writeGitHubStepSummary, } from "./infrastructure/action-outputs.js";
export { runPackageScannerAction } from "./application/run-package-scanner-action.js";
export { formatAnalysisSuccessLog } from "./application/format-success-log.js";
//# sourceMappingURL=index.js.map