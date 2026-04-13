# PackageScanner OSS Maintenance Guide

Treat this file as the primary maintenance guide for the repository, and keep `CLAUDE.md` aligned as a repository-specific pointer to this document.

## Dev environment tips

- Use Node `18.17+`; CI currently runs on Node `20`, so prefer matching that locally when possible.
- Enable Corepack before installing dependencies: `corepack enable`.
- Install dependencies with `pnpm install`.
- This repository commits `dist/` because GitHub Actions executes the compiled JavaScript directly; source changes under `src/` usually require regenerated `dist/`.
- Treat `action.yml` as the primary public contract for users of this repository.
- Keep consumer-facing docs aligned with behavior changes, especially `README.md`, `docs/API-SPEC.md`, and `examples/consumer-workflow.yml`.

## Repository map

- `action.yml`: public GitHub Action inputs, outputs, and runtime contract.
- `src/entrypoints`: action entrypoints.
- `src/application`: orchestration for the action flow.
- `src/domain`: lockfile detection and package-manager rules.
- `src/infrastructure`: file resolution, API request shaping, GitHub outputs, and summaries.
- `src/support`: small test helpers and dependency injection utilities.
- `dist/`: compiled runtime files that must stay in sync with source changes.
- `.github/workflows/ci.yml`: the authoritative CI validation plan.

## Testing instructions

- Start with the same flow used in CI: `pnpm run check` and then `pnpm run build`.
- `pnpm run check` already covers linting, formatting checks, and Vitest, so use it as the default pre-PR validation command.
- Run `pnpm test` for the unit suite only.
- Run `pnpm test:coverage` when changing branching behavior, public outputs, or error handling.
- Use `pnpm vitest run -t "<test name>"` to focus on a specific scenario.
- If you modify TypeScript source files, always run `pnpm run build` and review the generated `dist/` output.
- Add or update focused tests when public behavior, branching logic, path validation, or failure thresholds change.

## PR instructions

- Keep pull requests focused on one user-visible change or one maintenance concern.
- Before opening or merging a PR, run `pnpm run check` and `pnpm run build`.
- Review `dist/` changes carefully and confirm they are generated from the current source changes only.
- Update `CHANGELOG.md` when the public contract, documented behavior, or release expectations change.
- If behavior visible to action consumers changes, update `README.md` and `docs/API-SPEC.md` in the same PR.

## Release notes

- Before tagging a release, run `pnpm run check`.
- Rebuild with `pnpm run build`.
- Review the committed `dist/` diff.
- Update `CHANGELOG.md` if the release changes public behavior.
- Publish or move the major tag such as `v1` only after confirming the checked-in build output matches the release commit.

## Project-specific conventions

- Keep the runtime action thin; push decision logic into small testable modules under `src/`.
- Prefer explicit, consumer-oriented error messages because this project runs inside GitHub Actions logs.
- Preserve workspace safety checks that prevent inputs from resolving outside the checked-out repository.
- When changing inputs, outputs, or failure behavior, verify both the implementation and the consumer documentation stay aligned.
