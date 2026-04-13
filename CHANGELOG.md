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

## [0.1.0]

### Added

- initial PackageScanner GitHub Action implementation
