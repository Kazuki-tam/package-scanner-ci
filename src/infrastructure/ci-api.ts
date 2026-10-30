import { normalizePackageManager, type PackageManager } from "../domain/lockfile.js";
import { getTrimmedEnv } from "./action-inputs.js";

export const DEFAULT_API_BASE_URL = "https://www.package-scanner.dev";
export const ANALYZE_REQUEST_TIMEOUT_MS = 120_000;

function normalizeApiBaseUrl(baseUrl: string): string {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("PackageScanner: api-base-url must be a valid HTTPS URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("PackageScanner: api-base-url must use HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("PackageScanner: api-base-url must not include credentials.");
  }

  return url.toString().replace(/\/+$/, "");
}

export interface CreateRequestBodyInput {
  lockfileContent?: string;
  manager?: string;
  packageJsonContent?: string;
  enableMetadataCheck?: boolean;
}

function toRequestError(error: unknown, timeoutMs: number): Error | undefined {
  if (!(error instanceof Error)) {
    return new Error("PackageScanner: request failed before a response was received.");
  }

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return new Error(`PackageScanner: request timed out after ${timeoutMs}ms.`);
  }

  if (error instanceof TypeError) {
    return new Error("PackageScanner: request failed before a response was received.");
  }

  return undefined;
}

export function createRequestBody({
  lockfileContent,
  manager,
  packageJsonContent,
  enableMetadataCheck = false,
}: CreateRequestBodyInput): Record<string, unknown> {
  if (!lockfileContent && !packageJsonContent) {
    throw new Error(
      "PackageScanner: no lockfile or package.json found. Commit a lockfile or package.json, or set inputs.",
    );
  }

  const normalizedManager: PackageManager | undefined = normalizePackageManager(manager);

  if (lockfileContent && !normalizedManager) {
    throw new Error(
      "PackageScanner: could not determine package manager. Set package-manager input (npm, pnpm, yarn, or bun).",
    );
  }

  if (enableMetadataCheck && !packageJsonContent) {
    throw new Error(
      "PackageScanner: enable-metadata-check requires package.json content in the request. Ensure package.json exists or set the package-json input.",
    );
  }

  const body: Record<string, unknown> = {};

  if (lockfileContent) {
    body.lockfileContent = lockfileContent;
    body.manager = normalizedManager;
  }

  if (packageJsonContent) {
    body.packageJsonContent = packageJsonContent;
  }

  if (enableMetadataCheck) {
    body.options = { enableMetadataCheck: true };
  }

  return body;
}

export function getApiUrl(env: NodeJS.ProcessEnv): string {
  const configuredBaseUrl = getTrimmedEnv(env, "PACKAGE_SCANNER_API_BASE_URL");
  const normalizedBaseUrl = normalizeApiBaseUrl(configuredBaseUrl || DEFAULT_API_BASE_URL);

  if (normalizedBaseUrl !== DEFAULT_API_BASE_URL) {
    throw new Error(`PackageScanner: api-base-url must be ${DEFAULT_API_BASE_URL}.`);
  }

  return `${DEFAULT_API_BASE_URL}/api/ci/analyze`;
}

export interface AnalyzeResponse {
  ok: boolean;
  status: number;
  text: string;
}

/** The timeout covers both the response headers and the full response body. */
export async function postAnalyzeRequest(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
  timeoutMs = ANALYZE_REQUEST_TIMEOUT_MS,
): Promise<AnalyzeResponse> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    return { ok: response.ok, status: response.status, text: await response.text() };
  } catch (error) {
    const requestError = toRequestError(error, timeoutMs);

    if (requestError) {
      throw requestError;
    }

    throw error;
  }
}

export function parseJsonResponseText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("PackageScanner: response was not valid JSON.");
  }
}

export function createRequestFailedMessage(status: number, responseText: string): string {
  try {
    parseJsonResponseText(responseText);
    return `PackageScanner: request failed (${status}) with JSON response.`;
  } catch {
    return `PackageScanner: request failed (${status}) with non-JSON response.`;
  }
}
