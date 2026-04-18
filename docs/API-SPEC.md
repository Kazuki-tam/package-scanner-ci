# PackageScanner GitHub Action Specification

Japanese version: [docs/API-SPEC.ja.md](API-SPEC.ja.md)

## 1. Purpose

This document describes the public behavior of the PackageScanner GitHub Action
contained in this repository.

The Action reads a repository's dependency manifest files, sends their contents
to the PackageScanner analysis endpoint, and exposes a small set of summary
outputs back to the workflow.

This repository is intended to be public, so this document focuses on the
Action's public contract:

- what files the Action reads
- what inputs and outputs it supports
- what data it sends
- when the step fails
- what consumers should rely on

It does not attempt to freeze the entire internal backend response schema.

## 2. Scope

This Action is a Composite Action that:

- resolves `package.json` and supported lockfiles from the checked-out workspace
- builds a JSON request for the PackageScanner service
- sends the request with HTTPS `POST`
- writes summary values to GitHub Actions outputs
- optionally fails the step when malware is detected

This Action does not perform package analysis locally.

## 3. Supported Files

Supported files:

- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `pnpm-lock.yml`
- `yarn.lock`
- `bun.lock`

Not supported:

- `bun.lockb`

Lockfile auto-detection order:

1. `package-lock.json`
2. `pnpm-lock.yaml`
3. `pnpm-lock.yml`
4. `yarn.lock`
5. `bun.lock`

Notes:

- If `lockfile` is omitted, the Action tries to auto-detect a supported lockfile
  under `working-directory`.
- If `package-json` is omitted, the Action reads `package.json` from
  `working-directory` when the file exists.
- The Action requires at least one of `package.json` or a supported lockfile.
- `working-directory`, `lockfile`, and `package-json` must resolve within the
  GitHub workspace. Absolute paths and traversal outside the workspace are
  rejected.

## 4. Runtime Requirements

- `actions/checkout` must run before this Action
- Node.js `18.17+` must be available on the runner
- On self-hosted runners, `node` must be on `PATH`
- The workflow must allow outbound HTTPS access to
  `https://www.package-scanner.dev`

## 5. Public Inputs

The following inputs are defined by `action.yml` and are part of the Action's
public interface.

| Name                             | Type                                         | Required | Default   | Description                                                                            |
| -------------------------------- | -------------------------------------------- | -------- | --------- | -------------------------------------------------------------------------------------- |
| `working-directory`              | string                                       | No       | `.`       | Base directory used to resolve `lockfile` and `package.json`.                          |
| `lockfile`                       | string                                       | No       | `""`      | Lockfile path relative to `working-directory`. Auto-detected when omitted.             |
| `package-json`                   | string                                       | No       | `""`      | `package.json` path relative to `working-directory`. Uses `package.json` when omitted. |
| `package-manager`                | `npm \| pnpm \| yarn \| bun`                 | No       | `""`      | Optional override when the package manager cannot be inferred from the lockfile name.  |
| `fail-on-malware`                | string                                       | No       | `"true"`  | If set to `"false"`, the step stays successful even when malware is detected.          |
| `fail-on-vulnerability-severity` | `off \| low \| moderate \| high \| critical` | No       | `"high"`  | Lowest vulnerability severity that fails the step. `high` means `high` and `critical`. |
| `enable-metadata-check`          | string                                       | No       | `"false"` | If set to `"true"`, requests additional npm metadata checks. Requires `package.json`.  |

## 6. Public Outputs

The Action publishes the following outputs:

| Name                           | Type   | Description                                        |
| ------------------------------ | ------ | -------------------------------------------------- |
| `analysis-id`                  | string | Analysis ID returned by the service                |
| `malware-count`                | string | Number of malware findings                         |
| `vulnerability-count`          | string | Number of vulnerability findings                   |
| `vulnerability-unknown-count`  | string | Number of unknown severity vulnerability findings  |
| `vulnerability-low-count`      | string | Number of low severity vulnerability findings      |
| `vulnerability-moderate-count` | string | Number of moderate severity vulnerability findings |
| `vulnerability-high-count`     | string | Number of high severity vulnerability findings     |
| `vulnerability-critical-count` | string | Number of critical severity vulnerability findings |

Notes:

- These values are written through `GITHUB_OUTPUT`.
- `vulnerability-count` is derived from the response summary when available, and
  otherwise falls back to the length of the returned vulnerability list.
- Severity-specific counts are derived from normalized vulnerability severities.
- When `GITHUB_STEP_SUMMARY` is available, the Action also writes a Markdown
  summary table for human-readable CI output.

## 7. What the Action Sends

The Action sends a JSON request to:

- `POST https://www.package-scanner.dev/api/ci/analyze`

Request headers:

```http
Content-Type: application/json
Accept: application/json
```

Request body shape:

```json
{
  "lockfileContent": "string, optional",
  "manager": "npm | pnpm | yarn | bun, optional",
  "packageJsonContent": "string, optional",
  "options": {
    "enableMetadataCheck": true
  }
}
```

Behavior:

- `lockfileContent` is included when a supported lockfile is found or explicitly
  provided
- `manager` is included together with `lockfileContent`
- `packageJsonContent` is included when `package.json` is found or explicitly
  provided
- `options.enableMetadataCheck` is included only when
  `enable-metadata-check: "true"`

Validation rules enforced by the Action before sending:

- At least one of `lockfileContent` or `packageJsonContent` must exist
- If a lockfile is sent, the package manager must be known
  Additional server-side validation may still apply.

Vulnerability failure threshold:

- The Action inspects returned vulnerability severities when available.
- Supported threshold values are `off`, `low`, `moderate`, `high`, and `critical`.
- The default threshold is `high`.
- Severity aliases are normalized so `medium` is treated as `moderate`.

## 8. Data Handling for Public Consumers

Because this repository is public, consumers should understand exactly what data
leaves their CI environment when this Action runs.

The Action may transmit:

- the raw contents of a supported lockfile
- the raw contents of `package.json`
- the inferred or configured package manager
- the metadata-check flag

The Action does not read arbitrary files outside the GitHub workspace.

This Action always sends dependency metadata to the hosted PackageScanner
service at `https://www.package-scanner.dev`.

## 9. Failure Conditions

The Action fails in the following situations:

- the configured lockfile path does not exist
- a lockfile is available but the package manager cannot be determined
- neither a supported lockfile nor `package.json` is available
- the API returns a non-success status with either a JSON or non-JSON body
- the HTTP response is not valid JSON on an otherwise successful response
- a vulnerability is returned at or above `fail-on-vulnerability-severity`
- malware is detected and `fail-on-malware` is not set to `"false"`

Representative error messages:

- `PackageScanner: lockfile not found: ...`
- `PackageScanner: could not determine package manager. Set package-manager input (npm, pnpm, yarn, or bun).`
- `PackageScanner: no lockfile or package.json found. Commit a lockfile or package.json, or set inputs.`
- `PackageScanner: working-directory must stay within the GitHub workspace.`
- `PackageScanner: lockfile path must stay within the GitHub workspace.`
- `PackageScanner: request failed (500) with JSON response.`
- `PackageScanner: request failed (502) with non-JSON response.`
- `PackageScanner: response was not valid JSON.`
- `PackageScanner: blocking vulnerabilities detected at or above high: 1`
- `PackageScanner: malicious packages detected: 1`

## 10. Response Contract Used by the Action

The backend service may return more fields than the Action needs. For public
documentation, the stable contract is the subset the Action actually consumes.

The Action expects a JSON response that can provide:

```json
{
  "analysisId": "string",
  "malware": [],
  "vulnerabilities": [],
  "summary": {
    "total": 0,
    "vulnerabilityCount": 0
  }
}
```

The Action uses these values as follows:

- `analysisId` -> `analysis-id`
- `malware.length` -> `malware-count`
- `summary.vulnerabilityCount` or `vulnerabilities.length` ->
  `vulnerability-count`
- normalized severity buckets -> `vulnerability-unknown-count`,
  `vulnerability-low-count`, `vulnerability-moderate-count`,
  `vulnerability-high-count`, `vulnerability-critical-count`
- `summary.total` -> console summary only, not a formal Action output

Consumers of this Action should rely on the documented outputs, not on the full
backend response schema.

## 11. Example Workflow

```yaml
permissions:
  contents: read

jobs:
  package-scanner:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          working-directory: "."
          fail-on-malware: "true"
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "false"

      - run: |
          echo "analysis=${{ steps.scan.outputs.analysis-id }}"
          echo "unknown=${{ steps.scan.outputs.vulnerability-unknown-count }}"
          echo "low=${{ steps.scan.outputs.vulnerability-low-count }}"
          echo "moderate=${{ steps.scan.outputs.vulnerability-moderate-count }}"
          echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
          echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

## 12. Compatibility and Versioning

- Consumers should reference a major tag such as
  `Kazuki-tam/package-scanner-ci@v1`
- Breaking changes should be released under a new major tag such as `v2`
- Backward-compatible changes may be released under the existing major series
- Public documentation should stay aligned with `action.yml` and the runtime
  behavior in `src/entrypoints/action.ts` and `src/application/run-package-scanner-action.ts`

## 13. Maintainer Notes

When updating this repository:

- treat `action.yml` inputs and outputs as the primary public API
- keep this document focused on consumer-visible behavior
- avoid documenting internal-only backend fields unless the Action truly depends
  on them
- update examples when adding or changing public inputs
