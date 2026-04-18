# PackageScanner GitHub Action

GitHub Action for sending a repository's supported lockfile and/or `package.json`
to the PackageScanner CI API.

Japanese docs:

- [README](README.ja.md)
- [Consumer Guide](docs/CONSUMER-GUIDE.ja.md)
- [API Spec](docs/API-SPEC.ja.md)

The hosted PackageScanner service is available at
`https://www.package-scanner.dev`, with a product overview at
`https://www.package-scanner.dev/ja`.

## What This Action Does

- reads `package.json` and/or a supported lockfile from the checked-out workspace
- sends their raw contents to `POST https://www.package-scanner.dev/api/ci/analyze`
- publishes `analysis-id`, `malware-count`, `vulnerability-count`, and
  severity-specific vulnerability counts
- fails by default when malware or `high` / `critical` vulnerabilities are detected

This action does not perform dependency analysis locally. It acts as a thin CI
client for the PackageScanner service.

## Quick Start

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

      - run: |
          echo "analysis=${{ steps.scan.outputs.analysis-id }}"
          echo "malware=${{ steps.scan.outputs.malware-count }}"
          echo "vulns=${{ steps.scan.outputs.vulnerability-count }}"
          echo "unknown=${{ steps.scan.outputs.vulnerability-unknown-count }}"
          echo "low=${{ steps.scan.outputs.vulnerability-low-count }}"
          echo "moderate=${{ steps.scan.outputs.vulnerability-moderate-count }}"
          echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
          echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

A fuller workflow example is available in `examples/consumer-workflow.yml`.
For a step-by-step setup guide, see `docs/CONSUMER-GUIDE.md`.

## Inputs

| Input                            | Description                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `working-directory`              | Base directory for resolving lockfile and `package.json`. Default: `.`                                                                                   |
| `lockfile`                       | Optional lockfile path relative to `working-directory`. Auto-detects `package-lock.json`, `pnpm-lock.yaml`, `pnpm-lock.yml`, `yarn.lock`, or `bun.lock`. |
| `package-json`                   | Optional `package.json` path relative to `working-directory`. Defaults to `package.json` when that file exists.                                          |
| `package-manager`                | `npm`, `pnpm`, `yarn`, or `bun` when it cannot be inferred from the lockfile name.                                                                       |
| `fail-on-malware`                | Set to `false` to keep the step green even when malware is found. Default: `true`.                                                                       |
| `fail-on-vulnerability-severity` | Lowest vulnerability severity that fails the step: `off`, `low`, `moderate`, `high`, or `critical`. Default: `high`.                                     |
| `enable-metadata-check`          | Set to `true` to include npm metadata checks. Requires `package.json`. Default: `false`.                                                                 |

## Outputs

- `analysis-id`
- `malware-count`
- `vulnerability-count`
- `vulnerability-unknown-count`
- `vulnerability-low-count`
- `vulnerability-moderate-count`
- `vulnerability-high-count`
- `vulnerability-critical-count`

The action also writes a Markdown summary to the GitHub Actions job summary when
`GITHUB_STEP_SUMMARY` is available.

Example PR comment usage:

```yaml
- uses: actions/github-script@v7
  if: github.event_name == 'pull_request'
  with:
    script: |
      const body = [
        "## PackageScanner",
        `- Malware: ${{ steps.scan.outputs.malware-count }}`,
        `- Unknown: ${{ steps.scan.outputs.vulnerability-unknown-count }}`,
        `- Low: ${{ steps.scan.outputs.vulnerability-low-count }}`,
        `- Moderate: ${{ steps.scan.outputs.vulnerability-moderate-count }}`,
        `- High: ${{ steps.scan.outputs.vulnerability-high-count }}`,
        `- Critical: ${{ steps.scan.outputs.vulnerability-critical-count }}`,
      ].join("\n");
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body,
      });
```

## Failure Behavior

By default, the action fails the step when either of the following is true:

- malware findings are present
- at least one vulnerability has severity `high` or `critical`

You can tune vulnerability-based failures with `fail-on-vulnerability-severity`:

- `off`: never fail because of vulnerabilities
- `low`: fail on any vulnerability
- `moderate`: fail on `moderate`, `high`, or `critical`
- `high`: fail on `high` or `critical`
- `critical`: fail only on `critical`

These severity-specific outputs make it easy to drive PR comments, Slack
notifications, or custom deployment gates from workflow logic.

## Data Sent To PackageScanner

When this action runs, it may transmit:

- the raw contents of a supported lockfile
- the raw contents of `package.json`
- the inferred or configured package manager
- the `enable-metadata-check` flag

This action always sends data to the hosted PackageScanner service at
`https://www.package-scanner.dev`.

For safety, `working-directory`, `lockfile`, and `package-json` must resolve
within the checked-out GitHub workspace. Absolute paths and traversal outside
the workspace are rejected.

## Requirements

- run `actions/checkout` before this action so repository files are available
- ensure `node` is available on `PATH` on self-hosted runners
- use Node `18.17+` because the runtime relies on the built-in Fetch API
- allow outbound HTTPS access to `https://www.package-scanner.dev`

## Public Contract

The primary public interface of this repository is the GitHub Action declared in
`action.yml`.

Consumer-facing behavior is documented in:

- `action.yml`
- `docs/CONSUMER-GUIDE.md`
- `docs/API-SPEC.md`
- `examples/consumer-workflow.yml`

The TypeScript source under `src/` is organized for maintainability, but it is
not the compatibility contract that workflow consumers should target directly.

## Local Development

```bash
pnpm install
pnpm run check
pnpm run build
```

Tooling used in this repository:

- TypeScript in `strict` mode
- Vitest for unit tests
- Oxc (`oxlint` and `oxfmt`) for linting and formatting

## Repository Layout

- `action.yml`: action metadata and public inputs/outputs
- `src/entrypoints`: runtime entrypoints
- `src/application`: action orchestration logic
- `src/domain`: lockfile detection and package-manager rules
- `src/infrastructure`: file resolution, API request shaping, output handling
- `src/support`: small dependency-injection helpers for tests
- `dist/`: compiled JavaScript committed for GitHub Actions runtime use
- `docs/`: consumer-facing behavior and maintenance docs
- `examples/`: copy-paste workflow examples

## Maintainers

Before tagging a release:

1. Run `pnpm run check`.
2. Run `pnpm run build`.
3. Review the generated `dist/` changes.
4. Update `CHANGELOG.md` when the public behavior changed.
5. Publish or move the major tag such as `v1`.

Additional maintainer guidance:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
