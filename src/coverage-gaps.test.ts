import type { PathLike, PathOrFileDescriptor } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  LOCKFILE_CANDIDATES,
  LOCKFILE_DETECTION_ORDER,
  createRequestBody,
  createRequestFailedMessage,
  detectLockfile,
  getApiUrl,
  getTrimmedEnv,
  getVulnerabilitySeverity,
  inferManagerFromFilename,
  parseCiAnalyzeSuccessResponse,
  readFileIfExists,
  resolveLockfileInput,
  resolveWorkingDirectory,
  writeGitHubOutputs,
  writeGitHubStepSummary,
  countVulnerabilitiesAtOrAboveSeverity,
  normalizeVulnerabilitySeverityThreshold,
  DEFAULT_API_BASE_URL,
} from "./index.js";

function pathKey(p: PathLike): string {
  if (typeof p === "string") return p;
  if (Buffer.isBuffer(p)) return p.toString("utf8");
  return p.toString();
}

function asReadFileSync(
  implementation: (filePath: PathOrFileDescriptor) => string,
): NonNullable<Parameters<typeof readFileIfExists>[1]>["readFileSync"] {
  return implementation as NonNullable<Parameters<typeof readFileIfExists>[1]>["readFileSync"];
}

describe("domain lockfile helpers", () => {
  it("uses the same array for detection order and candidates", () => {
    expect(LOCKFILE_DETECTION_ORDER).toBe(LOCKFILE_CANDIDATES);
  });

  it("returns an empty manager for unknown lockfile names", () => {
    expect(inferManagerFromFilename("unknown.lock")).toBe("");
  });

  it("matches lockfile basenames case-insensitively", () => {
    expect(inferManagerFromFilename("YARN.LOCK")).toBe("yarn");
  });

  it("detects the first existing lockfile in priority order", () => {
    const dir = "/repo";
    const existsSync = (filePath: PathLike) => {
      const key = pathKey(filePath);
      return key === path.join(dir, "package-lock.json") || key === path.join(dir, "yarn.lock");
    };

    expect(detectLockfile(dir, { existsSync, pathModule: path })).toEqual({
      relativePath: "package-lock.json",
      manager: "npm",
    });
  });

  it("detects yarn when npm lockfile is absent", () => {
    const dir = "/repo";
    const existsSync = (filePath: PathLike) => pathKey(filePath) === path.join(dir, "yarn.lock");

    expect(detectLockfile(dir, { existsSync, pathModule: path })).toEqual({
      relativePath: "yarn.lock",
      manager: "yarn",
    });
  });

  it("detects bun.lock", () => {
    const dir = "/repo";
    const existsSync = (filePath: PathLike) => pathKey(filePath) === path.join(dir, "bun.lock");

    expect(detectLockfile(dir, { existsSync, pathModule: path })).toEqual({
      relativePath: "bun.lock",
      manager: "bun",
    });
  });
});

describe("action inputs helpers", () => {
  it("trims environment variables", () => {
    expect(getTrimmedEnv({ FOO: "  bar  " }, "FOO")).toBe("bar");
    expect(getTrimmedEnv({}, "MISSING")).toBe("");
  });

  it("reads files when present and returns undefined when missing", () => {
    const files: Record<string, string> = { "/a/b.txt": "hello" };
    const deps = {
      existsSync: (p: PathLike) => Object.hasOwn(files, pathKey(p)),
      readFileSync: asReadFileSync((filePath) => files[pathKey(filePath as PathLike)]),
    };

    expect(readFileIfExists("/a/b.txt", deps)).toBe("hello");
    expect(readFileIfExists("/nope", deps)).toBeUndefined();
  });

  it("returns undefined lockfile content when no lockfile is present", () => {
    const dir = "/workspace";
    const emptyFs = {
      existsSync: () => false,
      readFileSync: asReadFileSync(() => {
        throw new Error("unexpected read");
      }),
      pathModule: path,
    };

    expect(resolveLockfileInput(dir, {}, emptyFs)).toEqual({
      content: undefined,
      manager: undefined,
    });
  });

  it("throws when a configured lockfile path exists but is empty", () => {
    const dir = "/workspace";
    const lockPath = path.join(dir, "pnpm-lock.yaml");
    const fs = {
      existsSync: (p: PathLike) => pathKey(p) === lockPath,
      readFileSync: asReadFileSync(() => ""),
      pathModule: path,
    };

    expect(() =>
      resolveLockfileInput(dir, { PACKAGE_SCANNER_LOCKFILE: "pnpm-lock.yaml" }, fs),
    ).toThrow(/lockfile not found/);
  });

  it("resolves working directory from cwd when GITHUB_WORKSPACE is unset", () => {
    expect(resolveWorkingDirectory({}, "/runner/cwd", path)).toBe(path.resolve("/runner/cwd"));
  });
});

describe("ci-api helpers", () => {
  it("rejects empty request bodies", () => {
    expect(() => createRequestBody({})).toThrow(/no lockfile or package\.json found/);
  });

  it("requires a manager when a lockfile is present", () => {
    expect(() => createRequestBody({ lockfileContent: "lock" })).toThrow(
      /could not determine package manager/,
    );
  });

  it("defaults the API URL when the env var is missing", () => {
    expect(getApiUrl({})).toBe(`${DEFAULT_API_BASE_URL}/api/ci/analyze`);
  });

  it("labels JSON and non-JSON error bodies without echoing secrets", () => {
    expect(createRequestFailedMessage(500, '{"ok":true}')).toMatch(/JSON response/);
    expect(createRequestFailedMessage(500, "not json")).toMatch(/non-JSON response/);
  });
});

describe("action outputs edge cases", () => {
  it("parses responses without an analysis id", () => {
    const parsed = parseCiAnalyzeSuccessResponse({
      malware: [],
      vulnerabilities: [],
    });

    expect(parsed.analysisId).toBe("");
  });

  it("does not write GitHub outputs when the output path is missing", () => {
    const writes: string[] = [];
    writeGitHubOutputs(
      undefined,
      {
        analysisId: "id",
        malwareCount: 0,
        vulnerabilityCount: 0,
        vulnerabilitySeverityCounts: { low: 0, moderate: 0, high: 0, critical: 0 },
      },
      {
        appendFileSync: (_path, value) => {
          writes.push(String(value));
        },
      },
    );

    expect(writes).toHaveLength(0);
  });

  it("rejects newline characters in GitHub output values", () => {
    expect(() =>
      writeGitHubOutputs(
        "/tmp/out",
        {
          analysisId: "ok",
          malwareCount: 1,
          vulnerabilityCount: 0,
          vulnerabilitySeverityCounts: { low: 0, moderate: 0, high: 0, critical: 0 },
        },
        {
          appendFileSync: () => {},
        },
      ),
    ).not.toThrow();

    expect(() =>
      writeGitHubOutputs(
        "/tmp/out",
        {
          analysisId: "ok",
          // @ts-expect-error — exercise runtime guard for malformed numeric coercion
          malwareCount: "bad\n1",
          vulnerabilityCount: 0,
          vulnerabilitySeverityCounts: { low: 0, moderate: 0, high: 0, critical: 0 },
        },
        { appendFileSync: () => {} },
      ),
    ).toThrow(/unsafe GitHub output for malware-count/);
  });

  it("skips writing a step summary when the path is missing", () => {
    let writes = 0;
    writeGitHubStepSummary(
      undefined,
      {
        analysisId: "id",
        malwareCount: 0,
        vulnerabilityCount: 0,
        vulnerabilitySeverityCounts: { low: 0, moderate: 0, high: 0, critical: 0 },
        totalPackages: null,
        failOnMalware: false,
        vulnerabilityThreshold: "off",
      },
      {
        appendFileSync: () => {
          writes += 1;
        },
      },
    );

    expect(writes).toBe(0);
  });

  it("treats none as an off threshold", () => {
    expect(normalizeVulnerabilitySeverityThreshold("none")).toBe("off");
  });

  it("derives severities from nested advisory and CVSS fields", () => {
    expect(
      getVulnerabilitySeverity({
        databaseSpecific: { severity: "high" },
      }),
    ).toBe("high");

    expect(
      getVulnerabilitySeverity({
        advisory: { cvssScore: 8.2 },
      }),
    ).toBe("high");

    expect(
      getVulnerabilitySeverity({
        cvssScore: 3.1,
      }),
    ).toBe("low");

    expect(
      getVulnerabilitySeverity({
        cvssScore: 9.4,
      }),
    ).toBe("critical");

    expect(
      getVulnerabilitySeverity({
        cvss: { score: 6.5 },
      }),
    ).toBe("moderate");

    expect(getVulnerabilitySeverity(null)).toBeNull();

    expect(
      getVulnerabilitySeverity({
        database_specific: "not-an-object",
      }),
    ).toBeNull();
  });

  it("reads CVSS scores from severity arrays when direct severities are missing", () => {
    expect(
      getVulnerabilitySeverity({
        severity: [
          { type: "CVSS_V3", score: "5.5" },
          { type: "CVSS_V3", score: "2.0" },
        ],
      }),
    ).toBe("moderate");
  });

  it("ignores vulnerabilities without a parsable severity when counting by threshold", () => {
    expect(
      countVulnerabilitiesAtOrAboveSeverity([{ id: "unknown" }, { severity: "high" }], "high"),
    ).toBe(1);
  });
});
