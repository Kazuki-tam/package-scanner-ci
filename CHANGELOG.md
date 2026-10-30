# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic
versioning for its public GitHub Action behavior.

## [Unreleased]

### Added

- OSS maintenance files: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, and CI
  workflow validation.
- configurable vulnerability severity threshold for failing the GitHub Action,
  with a default policy of blocking `high` / `critical` vulnerabilities and any
  malware findings
- severity-specific vulnerability count outputs and a GitHub job summary table
  for easier CI and PR reporting

### Changed

- reorganized `src/` by responsibility into `entrypoints`, `application`,
  `domain`, `infrastructure`, and `support`
- improved HTTP error messages for non-JSON API failures
- expanded test coverage for working-directory handling, explicit lockfile
  inputs, package.json-only scans, and malware opt-out behavior
- rewrote README and synchronized public documentation with the current
  repository layout
- removed the public `api-base-url` input and now always send analysis requests
  to the hosted PackageScanner endpoint at `https://www.package-scanner.dev`
- raised the minimum supported Node.js version to `20.19` and upgraded the
  development toolchain to patched Vite `8.3.5`, Vitest `4.1.12`, Oxlint, and
  Oxfmt releases
- validate `package-manager` case-insensitively and fail closed on unsupported
  values
- time out analysis requests after 120 seconds, including time spent reading
  the response body, and reject success payloads that are not JSON objects or
  do not use arrays for finding lists

### Security

- reject any attempt to override the hosted API origin away from
  `https://www.package-scanner.dev`
- sanitize API-derived values before writing them to `GITHUB_STEP_SUMMARY`
- upgrade development dependencies that carried Vite, Vitest, nanoid,
  source-map-js, and tinypool advisories
- read Action outputs from environment variables in this repository's
  workflows, examples, and consumer docs, and disable credential persistence on
  those checkout steps

## [1.0.2]

Maintenance and developer-tooling release. The published GitHub Action behavior
is unchanged.

### Changed

- adopt `shk` secret/PII scanning hooks for Claude Code, Codex, and Cursor, with
  shared configuration in `shk.toml`
- harden npm installs by setting `minimumReleaseAge` in `pnpm-workspace.yaml`
- bump `vitest` and `@vitest/coverage-v8` to `4.1.8`

## [0.1.0]

### Added

- initial PackageScanner GitHub Action implementation
