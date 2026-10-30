import { normalizePackageManager } from "../domain/lockfile.js";
import { getTrimmedEnv } from "./action-inputs.js";
export const DEFAULT_API_BASE_URL = "https://www.package-scanner.dev";
export const ANALYZE_REQUEST_TIMEOUT_MS = 120_000;
function normalizeApiBaseUrl(baseUrl) {
    let url;
    try {
        url = new URL(baseUrl);
    }
    catch {
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
function toRequestError(error, timeoutMs) {
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
export function createRequestBody({ lockfileContent, manager, packageJsonContent, enableMetadataCheck = false, }) {
    if (!lockfileContent && !packageJsonContent) {
        throw new Error("PackageScanner: no lockfile or package.json found. Commit a lockfile or package.json, or set inputs.");
    }
    const normalizedManager = normalizePackageManager(manager);
    if (lockfileContent && !normalizedManager) {
        throw new Error("PackageScanner: could not determine package manager. Set package-manager input (npm, pnpm, yarn, or bun).");
    }
    if (enableMetadataCheck && !packageJsonContent) {
        throw new Error("PackageScanner: enable-metadata-check requires package.json content in the request. Ensure package.json exists or set the package-json input.");
    }
    const body = {};
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
export function getApiUrl(env) {
    const configuredBaseUrl = getTrimmedEnv(env, "PACKAGE_SCANNER_API_BASE_URL");
    const normalizedBaseUrl = normalizeApiBaseUrl(configuredBaseUrl || DEFAULT_API_BASE_URL);
    if (normalizedBaseUrl !== DEFAULT_API_BASE_URL) {
        throw new Error(`PackageScanner: api-base-url must be ${DEFAULT_API_BASE_URL}.`);
    }
    return `${DEFAULT_API_BASE_URL}/api/ci/analyze`;
}
export async function postAnalyzeRequest(fetchImpl, url, body, timeoutMs = ANALYZE_REQUEST_TIMEOUT_MS) {
    try {
        return await fetchImpl(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });
    }
    catch (error) {
        const requestError = toRequestError(error, timeoutMs);
        if (requestError) {
            throw requestError;
        }
        throw error;
    }
}
export function parseJsonResponseText(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("PackageScanner: response was not valid JSON.");
    }
}
export function createRequestFailedMessage(status, responseText) {
    try {
        parseJsonResponseText(responseText);
        return `PackageScanner: request failed (${status}) with JSON response.`;
    }
    catch {
        return `PackageScanner: request failed (${status}) with non-JSON response.`;
    }
}
//# sourceMappingURL=ci-api.js.map