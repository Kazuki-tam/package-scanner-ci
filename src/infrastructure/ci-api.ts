import { getTrimmedEnv } from "./action-inputs.js";

export const DEFAULT_API_BASE_URL = "https://www.package-scanner.dev";

export interface CreateRequestBodyInput {
  lockfileContent?: string;
  manager?: string;
  packageJsonContent?: string;
  enableMetadataCheck?: boolean;
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

  if (lockfileContent && !manager) {
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
    body.manager = manager;
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
  const baseUrl = getTrimmedEnv(env, "PACKAGE_SCANNER_API_BASE_URL") || DEFAULT_API_BASE_URL;
  return `${baseUrl.replace(/\/+$/, "")}/api/ci/analyze`;
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
