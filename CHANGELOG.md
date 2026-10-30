# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic
versioning for its public GitHub Action behavior.

## [Unreleased]

## [1.0.4] - 2026-10-31

Version `1.0.3` was prepared in `package.json` but never tagged; its changes
ship in this release.

### Changed

- raised the minimum supported Node.js version to `20.19`; self-hosted runners
  must provide Node `20.19+` on `PATH`
- validate `package-manager` case-insensitively and fail closed on values other
  than `npm`, `pnpm`, `yarn`, or `bun`
- time out analysis requests after 120 seconds, including time spent reading
  the response body
- reject successful responses that are not JSON objects or do not use arrays
  for `malware` and `vulnerabilities`, and ignore summary counts that are not
  non-negative integers
- replace control characters in the analysis ID before writing the success log
  line
- update workflow examples to `actions/checkout@v7`

### Security

- upgrade development dependencies to patched Vite `8.3.5`, Vitest `4.1.12`,
  Oxlint `1.90.0`, and Oxfmt `0.75.0`, and pin `source-map-js` to `1.2.2`,
  resolving Vite, Vitest, nanoid, source-map-js, and tinypool advisories
- read Action outputs from environment variables in this repository's
  workflows, examples, and consumer docs, and disable credential persistence on
  those checkout steps

## [1.0.2] - 2026-06-05

Maintenance and developer-tooling release. The published GitHub Action behavior
is unchanged.

### Changed

- adopt `shk` secret/PII scanning hooks for Claude Code, Codex, and Cursor, with
  shared configuration in `shk.toml`
- harden npm installs by setting `minimumReleaseAge` in `pnpm-workspace.yaml`
- bump `vitest` and `@vitest/coverage-v8` to `4.1.8`

## [1.0.1] - 2026-04-19

### Added

- `vulnerability-unknown-count` output and an `Unknown` row in the job summary
  for vulnerabilities whose severity cannot be determined

## [1.0.0] - 2026-04-14

### Added

- initial PackageScanner GitHub Action implementation
- OSS maintenance files: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, and CI
  workflow validation
- configurable vulnerability severity threshold for failing the GitHub Action,
  with a default policy of blocking `high` / `critical` vulnerabilities and any
  malware findings
- severity-specific vulnerability count outputs and a GitHub job summary table
  for easier CI and PR reporting

### Changed

- organized `src/` by responsibility into `entrypoints`, `application`,
  `domain`, `infrastructure`, and `support`
- clearer HTTP error messages for non-JSON API failures
- always send analysis requests to the hosted PackageScanner endpoint at
  `https://www.package-scanner.dev`; there is no `api-base-url` input

### Security

- reject any attempt to override the hosted API origin away from
  `https://www.package-scanner.dev`
- sanitize API-derived values before writing them to `GITHUB_STEP_SUMMARY`

[Unreleased]: https://github.com/Kazuki-tam/package-scanner-ci/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/Kazuki-tam/package-scanner-ci/compare/v1.0.2...v1.0.4
[1.0.2]: https://github.com/Kazuki-tam/package-scanner-ci/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Kazuki-tam/package-scanner-ci/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Kazuki-tam/package-scanner-ci/releases/tag/v1.0.0
