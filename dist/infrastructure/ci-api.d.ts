export declare const DEFAULT_API_BASE_URL = "https://www.package-scanner.dev";
export interface CreateRequestBodyInput {
    lockfileContent?: string;
    manager?: string;
    packageJsonContent?: string;
    enableMetadataCheck?: boolean;
}
export declare function createRequestBody({ lockfileContent, manager, packageJsonContent, enableMetadataCheck, }: CreateRequestBodyInput): Record<string, unknown>;
export declare function getApiUrl(env: NodeJS.ProcessEnv): string;
export declare function parseJsonResponseText(text: string): unknown;
export declare function createRequestFailedMessage(status: number, responseText: string): string;
//# sourceMappingURL=ci-api.d.ts.map