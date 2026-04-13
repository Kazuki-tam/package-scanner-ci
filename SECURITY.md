# Security Policy

## Supported Versions

Security fixes are applied on a best-effort basis to the latest code on the
default branch and the latest tagged major release line.

## Reporting A Vulnerability

This repository does not publish a direct security contact address.

If your Git hosting platform exposes private vulnerability reporting for this
repository, use that channel for security issues. Otherwise, avoid posting full
exploit details in a public issue before a fix is available.

Please include:

- affected action version or commit
- impacted package manager and lockfile type
- whether the issue affects the hosted service, the GitHub Action client, or both
- reproduction steps or a minimal repository when possible

## Scope

This repository contains the GitHub Action client that reads dependency
manifests and sends them to the PackageScanner API. Security reports may fall
into one of these categories:

- accidental disclosure of files beyond the documented inputs
- incorrect request handling or trust boundaries in the action runtime
- output handling that can leak or corrupt workflow state
- vulnerable development dependencies or unsafe release automation

Hosted service behavior may be related, but this repository documents and ships
the GitHub Action integration layer.

Current hardening measures in this repository include:

- rejecting `working-directory`, `lockfile`, and `package-json` paths that
  escape the GitHub workspace
- validating GitHub Actions output values before writing to `GITHUB_OUTPUT`
- avoiding raw upstream response bodies in default error messages
