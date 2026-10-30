export declare const DEFAULT_API_BASE_URL = "https://www.package-scanner.dev";
export declare const ANALYZE_REQUEST_TIMEOUT_MS = 120000;
export interface CreateRequestBodyInput {
    lockfileContent?: string;
    manager?: string;
    packageJsonContent?: string;
    enableMetadataCheck?: boolean;
}
export declare function createRequestBody({ lockfileContent, manager, packageJsonContent, enableMetadataCheck, }: CreateRequestBodyInput): Record<string, unknown>;
export declare function getApiUrl(env: NodeJS.ProcessEnv): string;
export interface AnalyzeResponse {
    ok: boolean;
    status: number;
    text: string;
}
/** The timeout covers both the response headers and the full response body. */
export declare function postAnalyzeRequest(fetchImpl: typeof fetch, url: string, body: unknown, timeoutMs?: number): Promise<AnalyzeResponse>;
export declare function parseJsonResponseText(text: string): unknown;
export declare function createRequestFailedMessage(status: number, responseText: string): string;
//# sourceMappingURL=ci-api.d.ts.map