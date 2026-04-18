import type fs from "node:fs";
import type { PathLike } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  countVulnerabilitiesAtOrAboveSeverity,
  countVulnerabilitiesBySeverity,
  createRequestBody,
  getVulnerabilitySeverity,
  getApiUrl,
  normalizeVulnerabilitySeverityThreshold,
  parseJsonResponseText,
  parseCiAnalyzeSuccessResponse,
  resolveLockfileInput,
  resolvePackageJsonInput,
  resolveWorkingDirectory,
  runPackageScannerAction,
} from "./index.js";

function pathKey(p: PathLike): string {
  if (typeof p === "string") return p;
  if (Buffer.isBuffer(p)) return p.toString("utf8");
  return p.toString();
}

interface FakeFs {
  existsSync: (filePath: PathLike) => boolean;
  readFileSync: (filePath: PathLike) => string;
  realpathSync: (filePath: PathLike) => string;
  appendFileSync: (filePath: string, value: string) => void;
  writes: Array<{ path: string; value: string }>;
}

function createFakeFs(files: Record<string, string> = {}): FakeFs {
  const writes: Array<{ path: string; value: string }> = [];

  return {
    existsSync(filePath: PathLike) {
      return Object.hasOwn(files, pathKey(filePath));
    },
    readFileSync(filePath: PathLike) {
      const key = pathKey(filePath);
      const value = files[key];
      if (value == null) {
        throw new Error(`Unexpected read: ${key}`);
      }

      return value;
    },
    realpathSync(filePath: PathLike) {
      const key = pathKey(filePath);
      return key;
    },
    appendFileSync(filePath: string, value: string) {
      writes.push({ path: filePath, value });
    },
    writes,
  };
}

function asFsModule(fake: FakeFs): typeof fs {
  return fake as unknown as typeof fs;
}

describe("package-scanner action helper", () => {
  it("auto-detects a lockfile and manager from the working directory", () => {
    const dir = "/workspace";
    const lockfilePath = path.join(dir, "pnpm-lock.yaml");
    const fsModule = createFakeFs({
      [lockfilePath]: "lockfile-content",
    });

    const result = resolveLockfileInput(
      dir,
      {},
      fsModule as unknown as NonNullable<Parameters<typeof resolveLockfileInput>[2]>,
    );

    expect(result).toEqual({
      content: "lockfile-content",
      manager: "pnpm",
    });
  });

  it("auto-detects pnpm-lock.yml and infers pnpm", () => {
    const dir = "/workspace";
    const lockfilePath = path.join(dir, "pnpm-lock.yml");
    const fsModule = createFakeFs({
      [lockfilePath]: "lockfile-yml",
    });

    const result = resolveLockfileInput(
      dir,
      {},
      fsModule as unknown as NonNullable<Parameters<typeof resolveLockfileInput>[2]>,
    );

    expect(result).toEqual({
      content: "lockfile-yml",
      manager: "pnpm",
    });
  });

  it("resolves explicit lockfile and package manager inputs", () => {
    const dir = "/workspace";
    const lockfilePath = path.join(dir, "custom", "package-lock.json");
    const fsModule = createFakeFs({
      [lockfilePath]: "custom-lockfile",
    });

    const result = resolveLockfileInput(
      dir,
      {
        PACKAGE_SCANNER_LOCKFILE: "custom/package-lock.json",
        PACKAGE_SCANNER_PACKAGE_MANAGER: "npm",
      },
      fsModule as unknown as NonNullable<Parameters<typeof resolveLockfileInput>[2]>,
    );

    expect(result).toEqual({
      content: "custom-lockfile",
      manager: "npm",
    });
  });

  it("resolves package.json from the configured working directory", () => {
    const cwd = "/runner/current";
    const packageJsonPath = "/workspace/packages/app/package.json";
    const fsModule = createFakeFs({
      [packageJsonPath]: '{"name":"app"}',
    });
    const workingDirectory = resolveWorkingDirectory(
      {
        GITHUB_WORKSPACE: "/workspace",
        PACKAGE_SCANNER_WORKING_DIRECTORY: "packages/app",
      },
      cwd,
      path,
    );

    expect(workingDirectory).toBe("/workspace/packages/app");
    expect(
      resolvePackageJsonInput(
        workingDirectory,
        {},
        fsModule as unknown as NonNullable<Parameters<typeof resolvePackageJsonInput>[2]>,
      ),
    ).toBe('{"name":"app"}');
  });

  it("rejects a working-directory outside the GitHub workspace", () => {
    expect(() =>
      resolveWorkingDirectory(
        {
          GITHUB_WORKSPACE: "/workspace",
          PACKAGE_SCANNER_WORKING_DIRECTORY: "../secrets",
        },
        "/workspace",
        path,
      ),
    ).toThrow(/working-directory must stay within the GitHub workspace/);
  });

  it("rejects a lockfile path outside the working directory", () => {
    const dir = "/workspace";
    const fsModule = createFakeFs();

    expect(() =>
      resolveLockfileInput(
        dir,
        {
          PACKAGE_SCANNER_LOCKFILE: "../secret.txt",
        },
        fsModule as unknown as NonNullable<Parameters<typeof resolveLockfileInput>[2]>,
      ),
    ).toThrow(/lockfile path must stay within the GitHub workspace/);
  });

  it("rejects an absolute package.json path", () => {
    const dir = "/workspace";
    const fsModule = createFakeFs();

    expect(() =>
      resolvePackageJsonInput(
        dir,
        {
          PACKAGE_SCANNER_PACKAGE_JSON: "/etc/passwd",
        },
        fsModule as unknown as NonNullable<Parameters<typeof resolvePackageJsonInput>[2]>,
      ),
    ).toThrow(/package-json path must be a relative path within the GitHub workspace/);
  });

  it("builds a request body with optional metadata checks", () => {
    expect(
      createRequestBody({
        packageJsonContent: '{"name":"demo"}',
        enableMetadataCheck: true,
      }),
    ).toEqual({
      packageJsonContent: '{"name":"demo"}',
      options: { enableMetadataCheck: true },
    });
  });

  it("throws when enable-metadata-check is requested without package.json content", () => {
    expect(() =>
      createRequestBody({
        lockfileContent: "lock",
        manager: "npm",
        enableMetadataCheck: true,
      }),
    ).toThrow(/enable-metadata-check requires package\.json content/);
  });

  it("rejects the action run when metadata check is enabled but package.json is missing", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "pnpm-lock.yaml")]: "lockfile-only",
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
          PACKAGE_SCANNER_ENABLE_METADATA_CHECK: "true",
        },
        cwd: workspace,
        fetchImpl: async () => new Response("{}", { status: 500 }),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/enable-metadata-check requires package\.json content/);
  });

  it("parses CI analyze summary fields consistently", () => {
    expect(
      parseCiAnalyzeSuccessResponse({
        analysisId: "id1",
        malware: [{ x: 1 }],
        vulnerabilities: [],
        summary: { total: 10, vulnerabilityCount: 2 },
      }),
    ).toMatchObject({
      analysisId: "id1",
      malwareCount: 1,
      vulnerabilityCount: 2,
      totalPackages: 10,
    });
  });

  it("normalizes vulnerability failure thresholds", () => {
    expect(normalizeVulnerabilitySeverityThreshold(undefined)).toBe("high");
    expect(normalizeVulnerabilitySeverityThreshold("moderate")).toBe("moderate");
    expect(normalizeVulnerabilitySeverityThreshold("off")).toBe("off");
    expect(normalizeVulnerabilitySeverityThreshold("false")).toBe("off");
    expect(() => normalizeVulnerabilitySeverityThreshold("urgent")).toThrow(
      /invalid fail-on-vulnerability-severity/,
    );
  });

  it("extracts vulnerability severities from common response shapes", () => {
    expect(getVulnerabilitySeverity({ severity: "HIGH" })).toBe("high");
    expect(getVulnerabilitySeverity({ severity: "medium" })).toBe("moderate");
    expect(getVulnerabilitySeverity({ severity: "UNKNOWN" })).toBe("unknown");
    expect(getVulnerabilitySeverity({ database_specific: { severity: "critical" } })).toBe(
      "critical",
    );
    expect(getVulnerabilitySeverity({ severity: [{ type: "CVSS_V3", score: "8.1" }] })).toBe(
      "high",
    );
  });

  it("counts vulnerabilities at or above a configured threshold", () => {
    expect(
      countVulnerabilitiesAtOrAboveSeverity(
        [
          { severity: "low" },
          { severity: "moderate" },
          { severity: "high" },
          { database_specific: { severity: "critical" } },
        ],
        "high",
      ),
    ).toBe(2);
    expect(
      countVulnerabilitiesAtOrAboveSeverity([{ severity: "low" }, { severity: "moderate" }], "off"),
    ).toBe(0);
  });

  it("counts vulnerabilities by normalized severity", () => {
    expect(
      countVulnerabilitiesBySeverity([
        { severity: "low" },
        { severity: "medium" },
        { severity: "high" },
        { database_specific: { severity: "critical" } },
        { severity: "unknown" },
      ]),
    ).toEqual({
      unknown: 1,
      low: 1,
      moderate: 1,
      high: 1,
      critical: 1,
    });
  });

  it("throws when the API response is not valid JSON", () => {
    expect(() => parseJsonResponseText("not-json")).toThrow(
      /PackageScanner: response was not valid JSON\./,
    );
  });

  it("uses the hosted API URL by default", () => {
    expect(getApiUrl({})).toBe("https://www.package-scanner.dev/api/ci/analyze");
  });

  it("accepts the hosted API URL with a trailing slash", () => {
    expect(
      getApiUrl({
        PACKAGE_SCANNER_API_BASE_URL: "https://www.package-scanner.dev/",
      }),
    ).toBe("https://www.package-scanner.dev/api/ci/analyze");
  });

  it("rejects a non-HTTPS API URL", () => {
    expect(() =>
      getApiUrl({
        PACKAGE_SCANNER_API_BASE_URL: "http://www.package-scanner.dev",
      }),
    ).toThrow(/api-base-url must use HTTPS/);
  });

  it("rejects API URLs with embedded credentials", () => {
    expect(() =>
      getApiUrl({
        PACKAGE_SCANNER_API_BASE_URL: "https://user:pass@www.package-scanner.dev",
      }),
    ).toThrow(/api-base-url must not include credentials/);
  });

  it("rejects any non-hosted API URL", () => {
    expect(() =>
      getApiUrl({
        PACKAGE_SCANNER_API_BASE_URL: "https://scanner.example.com",
      }),
    ).toThrow(/api-base-url must be https:\/\/www\.package-scanner\.dev\./);
  });

  it("posts the request and writes GitHub outputs", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
      [path.join(workspace, "pnpm-lock.yaml")]: "lockfile",
    });

    const fetchImpl = (async (input: Parameters<typeof fetch>[0], init: RequestInit = {}) => {
      const url = typeof input === "string" || input instanceof URL ? input : input.url;
      expect(url).toBe("https://www.package-scanner.dev/api/ci/analyze");
      expect(init.method).toBe("POST");
      expect(init.body).toBe(
        JSON.stringify({
          lockfileContent: "lockfile",
          manager: "pnpm",
          packageJsonContent: '{"name":"demo","version":"1.0.0"}',
          options: { enableMetadataCheck: true },
        }),
      );

      return new Response(
        JSON.stringify({
          analysisId: "an_test123",
          malware: [],
          vulnerabilities: [],
          summary: { total: 4, vulnerabilityCount: 0 },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        GITHUB_OUTPUT: "/tmp/github-output.txt",
        PACKAGE_SCANNER_ENABLE_METADATA_CHECK: "true",
      },
      cwd: workspace,
      fetchImpl,
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result).toEqual({
      analysisId: "an_test123",
      malware: [],
      malwareCount: 0,
      vulnerabilities: [],
      vulnerabilityCount: 0,
      vulnerabilitySeverityCounts: {
        unknown: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
      },
      totalPackages: 4,
    });
    expect(fsModule.writes).toEqual([
      { path: "/tmp/github-output.txt", value: "analysis-id=an_test123\n" },
      { path: "/tmp/github-output.txt", value: "malware-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-unknown-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-low-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-moderate-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-high-count=0\n" },
      { path: "/tmp/github-output.txt", value: "vulnerability-critical-count=0\n" },
    ]);
  });

  it("writes a GitHub step summary with severity counts", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        GITHUB_STEP_SUMMARY: "/tmp/step-summary.md",
        PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
        PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY: "off",
      },
      cwd: workspace,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            analysisId: "an_summary",
            malware: [],
            vulnerabilities: [
              { id: "GHSA-unknown", severity: "UNKNOWN" },
              { id: "GHSA-low", severity: "low" },
              { id: "GHSA-medium", severity: "medium" },
              { id: "GHSA-critical", severity: "critical" },
            ],
            summary: { total: 3, vulnerabilityCount: 4 },
          }),
          { status: 200 },
        ),
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result.vulnerabilitySeverityCounts).toEqual({
      unknown: 1,
      low: 1,
      moderate: 1,
      high: 0,
      critical: 1,
    });
    expect(fsModule.writes).toContainEqual({
      path: "/tmp/step-summary.md",
      value:
        "## PackageScanner summary\n\n| Metric | Value |\n| --- | ---: |\n| Analysis ID | <code>an_summary</code> |\n| Packages scanned | 3 |\n| Malware findings | 0 |\n| Vulnerabilities | 4 |\n| Unknown | 1 |\n| Low | 1 |\n| Moderate | 1 |\n| High | 0 |\n| Critical | 1 |\n\nBlocking policy: malware disabled, vulnerabilities at or above `off`.\n\n",
    });
  });

  it("escapes API-controlled values in the GitHub step summary", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        GITHUB_STEP_SUMMARY: "/tmp/step-summary.md",
        PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
        PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY: "off",
      },
      cwd: workspace,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            analysisId: 'bad|id\n<script>alert("xss")</script>',
            malware: [],
            vulnerabilities: [],
            summary: { total: 1, vulnerabilityCount: 0 },
          }),
          { status: 200 },
        ),
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(fsModule.writes).toContainEqual({
      path: "/tmp/step-summary.md",
      value:
        "## PackageScanner summary\n\n| Metric | Value |\n| --- | ---: |\n| Analysis ID | <code>bad&#124;id &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</code> |\n| Packages scanned | 1 |\n| Malware findings | 0 |\n| Vulnerabilities | 0 |\n| Unknown | 0 |\n| Low | 0 |\n| Moderate | 0 |\n| High | 0 |\n| Critical | 0 |\n\nBlocking policy: malware disabled, vulnerabilities at or above `off`.\n\n",
    });
  });

  it("rejects unsafe GitHub output values from the API response", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
          GITHUB_OUTPUT: "/tmp/github-output.txt",
          PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
          PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY: "off",
        },
        cwd: workspace,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              analysisId: "safe\ninjected=value",
              malware: [],
              vulnerabilities: [],
              summary: { total: 1, vulnerabilityCount: 0 },
            }),
            { status: 200 },
          ),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/unsafe GitHub output for analysis-id/);
  });

  it("supports package.json-only scans", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
      },
      cwd: workspace,
      fetchImpl: async (_input, init: RequestInit = {}) => {
        expect(init.body).toBe(
          JSON.stringify({ packageJsonContent: '{"name":"demo","version":"1.0.0"}' }),
        );
        return new Response(
          JSON.stringify({
            analysisId: "an_pkgonly",
            malware: [],
            vulnerabilities: [],
            summary: { total: 1, vulnerabilityCount: 0 },
          }),
          { status: 200 },
        );
      },
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result.analysisId).toBe("an_pkgonly");
    expect(result.totalPackages).toBe(1);
  });

  it("throws when malware is found and fail-on-malware is enabled", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
        },
        cwd: workspace,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              analysisId: "an_test123",
              malware: [{ packageName: "bad-pkg", version: "1.0.0" }],
              vulnerabilities: [],
              summary: { total: 1, vulnerabilityCount: 0 },
            }),
            { status: 200 },
          ),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/PackageScanner: malicious packages detected: 1/);
  });

  it("does not fail the action when fail-on-malware is false", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
      },
      cwd: workspace,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            analysisId: "an_allowed",
            malware: [{ packageName: "bad-pkg", version: "1.0.0" }],
            vulnerabilities: [],
            summary: { total: 1, vulnerabilityCount: 0 },
          }),
          { status: 200 },
        ),
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result.malwareCount).toBe(1);
    expect(result.analysisId).toBe("an_allowed");
  });

  it("fails by default when a high severity vulnerability is reported", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
          PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
        },
        cwd: workspace,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              analysisId: "an_vuln_high",
              malware: [],
              vulnerabilities: [{ id: "GHSA-demo", severity: "high" }],
              summary: { total: 1, vulnerabilityCount: 1 },
            }),
            { status: 200 },
          ),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/blocking vulnerabilities detected at or above high: 1/);
  });

  it("does not fail on moderate vulnerabilities when the default threshold is high", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
      },
      cwd: workspace,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            analysisId: "an_vuln_moderate",
            malware: [],
            vulnerabilities: [{ id: "GHSA-demo", severity: "moderate" }],
            summary: { total: 1, vulnerabilityCount: 1 },
          }),
          { status: 200 },
        ),
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result.vulnerabilityCount).toBe(1);
    expect(result.analysisId).toBe("an_vuln_moderate");
    expect(result.vulnerabilitySeverityCounts).toEqual({
      unknown: 0,
      low: 0,
      moderate: 1,
      high: 0,
      critical: 0,
    });
  });

  it("fails when the configured vulnerability threshold is met", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
          PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
          PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY: "moderate",
        },
        cwd: workspace,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              analysisId: "an_vuln_threshold",
              malware: [],
              vulnerabilities: [{ id: "GHSA-demo", severity: "moderate" }],
              summary: { total: 1, vulnerabilityCount: 1 },
            }),
            { status: 200 },
          ),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/blocking vulnerabilities detected at or above moderate: 1/);
  });

  it("supports disabling vulnerability-based failures", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    const result = await runPackageScannerAction({
      env: {
        GITHUB_WORKSPACE: workspace,
        PACKAGE_SCANNER_FAIL_ON_MALWARE: "false",
        PACKAGE_SCANNER_FAIL_ON_VULNERABILITY_SEVERITY: "off",
      },
      cwd: workspace,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            analysisId: "an_vuln_off",
            malware: [],
            vulnerabilities: [{ id: "GHSA-demo", severity: "critical" }],
            summary: { total: 1, vulnerabilityCount: 1 },
          }),
          { status: 200 },
        ),
      fsModule: asFsModule(fsModule),
      pathModule: path,
    });

    expect(result.vulnerabilityCount).toBe(1);
    expect(result.analysisId).toBe("an_vuln_off");
    expect(result.vulnerabilitySeverityCounts).toEqual({
      unknown: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 1,
    });
  });

  it("reports non-JSON error responses with status and snippet", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
        },
        cwd: workspace,
        fetchImpl: async () => new Response("<html>bad gateway</html>", { status: 502 }),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/PackageScanner: request failed \(502\) with non-JSON response\./);
  });

  it("does not include JSON error response bodies in failure messages", async () => {
    const workspace = "/workspace";
    const fsModule = createFakeFs({
      [path.join(workspace, "package.json")]: '{"name":"demo","version":"1.0.0"}',
    });

    await expect(
      runPackageScannerAction({
        env: {
          GITHUB_WORKSPACE: workspace,
        },
        cwd: workspace,
        fetchImpl: async () =>
          new Response(JSON.stringify({ message: "token=secret", detail: "sensitive" }), {
            status: 500,
          }),
        fsModule: asFsModule(fsModule),
        pathModule: path,
      }),
    ).rejects.toThrow(/PackageScanner: request failed \(500\) with JSON response\./);
  });
});
