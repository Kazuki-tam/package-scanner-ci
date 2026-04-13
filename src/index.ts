/**
 * Public API surface for consumers and tests. Internal implementation is split
 * by responsibility under `domain`, `infrastructure`, `application`, and
 * `support`.
 */

export type { PathFsDeps, FsReadDeps } from "./support/fs-deps.js";

export {
  LOCKFILE_CANDIDATES,
  LOCKFILE_DETECTION_ORDER,
  PackageManager,
  detectLockfile,
  inferManagerFromFilename,
} from "./domain/lockfile.js";

export type { ResolveLockfileInputResult } from "./infrastructure/action-inputs.js";
export {
  getTrimmedEnv,
  readFileIfExists,
  resolveLockfileInput,
  resolvePackageJsonInput,
  resolveWorkingDirectory,
} from "./infrastructure/action-inputs.js";

export type { CreateRequestBodyInput } from "./infrastructure/ci-api.js";
export {
  createRequestFailedMessage,
  DEFAULT_API_BASE_URL,
  createRequestBody,
  getApiUrl,
  parseJsonResponseText,
} from "./infrastructure/ci-api.js";

export type {
  CiAnalyzeSuccessResponse,
  ParsedCiAnalyzeResult,
  VulnerabilitySeverity,
  VulnerabilitySeverityCounts,
  VulnerabilitySeverityThreshold,
} from "./infrastructure/action-outputs.js";
export {
  countVulnerabilitiesAtOrAboveSeverity,
  countVulnerabilitiesBySeverity,
  getVulnerabilitySeverity,
  normalizeVulnerabilitySeverityThreshold,
  parseCiAnalyzeSuccessResponse,
  VULNERABILITY_SEVERITY_ORDER,
  writeGitHubOutputs,
  writeGitHubStepSummary,
} from "./infrastructure/action-outputs.js";

export type {
  RunPackageScannerActionOptions,
  RunPackageScannerActionResult,
} from "./application/run-package-scanner-action.js";
export { runPackageScannerAction } from "./application/run-package-scanner-action.js";
