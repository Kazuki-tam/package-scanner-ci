# PackageScanner Consumer Guide

Japanese version: [docs/CONSUMER-GUIDE.ja.md](CONSUMER-GUIDE.ja.md)

This guide is for teams who want to use the public PackageScanner GitHub Action
from their own repositories.

If you need the formal public contract, see `action.yml` and `docs/API-SPEC.md`.
This document focuses on practical setup and day-to-day usage.

## What You Get

When this Action runs in your workflow, it:

- reads a supported lockfile and/or `package.json` from your repository
- sends that dependency metadata to the hosted PackageScanner service
- exposes scan summary values as GitHub Actions outputs
- can fail the workflow when malware or blocking vulnerabilities are found

Supported lockfiles:

- `package-lock.json`
- `pnpm-lock.yaml`
- `pnpm-lock.yml`
- `yarn.lock`
- `bun.lock`

## Before You Add It

Make sure your workflow environment can satisfy the following:

- `actions/checkout` runs before this Action
- the runner has Node.js `18.17+`
- the runner can reach `https://www.package-scanner.dev` over HTTPS

For most GitHub-hosted runners, no extra setup is required beyond checkout.

## Minimal Setup

Use the Action in a workflow that scans your dependency files whenever they
change:

```yaml
name: PackageScanner

on:
  pull_request:
    paths:
      - "package.json"
      - "package-lock.json"
      - "pnpm-lock.yaml"
      - "pnpm-lock.yml"
      - "yarn.lock"
      - "bun.lock"

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
```

By default, the Action:

- auto-detects a supported lockfile under the repository root
- reads `package.json` when it exists
- fails when malware is found
- fails when a vulnerability with severity `high` or `critical` is found

## Common Configuration

Use `with:` inputs when your repository layout or policy needs something more
specific.

### Scan a Subdirectory

This is the most common setup for monorepos or app-in-subfolder repositories:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    working-directory: "apps/web"
```

### Provide an Explicit Lockfile

Use this when auto-detection is not enough or when you want to be explicit:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    working-directory: "."
    lockfile: "pnpm-lock.yaml"
```

### Override the Package Manager

Normally the Action infers this from the lockfile name. Set it manually only
when inference is not possible for your setup:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    lockfile: "custom/path/to/lockfile"
    package-manager: "pnpm"
```

### Change the Failure Threshold

The `fail-on-vulnerability-severity` input controls which vulnerabilities should
fail the step:

- `off`: never fail because of vulnerabilities
- `low`: fail on any vulnerability
- `moderate`: fail on `moderate`, `high`, or `critical`
- `high`: fail on `high` or `critical`
- `critical`: fail only on `critical`

Example:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-vulnerability-severity: "critical"
```

If you want the scan to report malware without blocking the workflow, set:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-malware: "false"
```

### Enable Metadata Checks

Set `enable-metadata-check: "true"` to request additional npm metadata checks.
This requires `package.json` to be included in the scan request.

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    enable-metadata-check: "true"
```

## Using the Outputs

The Action exposes the following outputs:

- `analysis-id`
- `malware-count`
- `vulnerability-count`
- `vulnerability-low-count`
- `vulnerability-moderate-count`
- `vulnerability-high-count`
- `vulnerability-critical-count`

You can use them in later steps for reporting or workflow decisions.

Example:

```yaml
- name: Print scan summary
  run: |
    echo "analysis=${{ steps.scan.outputs.analysis-id }}"
    echo "malware=${{ steps.scan.outputs.malware-count }}"
    echo "vulns=${{ steps.scan.outputs.vulnerability-count }}"
    echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
    echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

The Action also writes a Markdown summary to the GitHub Actions job summary when
`GITHUB_STEP_SUMMARY` is available.

## Example: Monorepo Package Scan

```yaml
name: PackageScanner

on:
  pull_request:
    paths:
      - "apps/web/package.json"
      - "apps/web/pnpm-lock.yaml"

permissions:
  contents: read

jobs:
  scan-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          working-directory: "apps/web"
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "true"
```

## Example: Daily Scheduled Scan

This is useful when you want to catch newly disclosed malware or
vulnerabilities even if your lockfile has not changed recently:

```yaml
name: PackageScanner Daily Check

on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "true"
```

GitHub Actions `schedule` uses UTC. Adjust the cron expression to match the
time window that makes sense for your team.

## What Data Leaves Your Repository

This Action is a thin client for the hosted PackageScanner service. It does not
analyze dependencies locally.

When it runs, it may send:

- the raw contents of a supported lockfile
- the raw contents of `package.json`
- the inferred or configured package manager
- the metadata-check flag

Paths must stay within the checked-out GitHub workspace. Absolute paths and
path traversal outside the workspace are rejected.

## Troubleshooting

### No files were found

If the Action reports that no lockfile or `package.json` was found:

- confirm `actions/checkout` ran before the scan step
- confirm your files exist in the checked-out workspace
- set `working-directory`, `lockfile`, or `package-json` explicitly if your
  files are not at the repository root

### The package manager could not be determined

If you use a non-standard lockfile path or file name, set `package-manager`
explicitly to one of:

- `npm`
- `pnpm`
- `yarn`
- `bun`

### The workflow fails unexpectedly

Check whether the failure came from:

- a blocking vulnerability threshold
- malware detection
- a network or API error
- an invalid file path outside the GitHub workspace

If you want a non-blocking rollout first, start with:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-malware: "false"
    fail-on-vulnerability-severity: "off"
```

Then tighten the thresholds once your team is comfortable with the scan results.
