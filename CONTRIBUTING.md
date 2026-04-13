# Contributing

Thanks for contributing to the PackageScanner GitHub Action.

## Development Setup

Requirements:

- Node `18.17+`
- `pnpm` via Corepack or a local install

Setup:

```bash
corepack enable
pnpm install
```

## Local Checks

Run the full local validation before opening a pull request:

```bash
pnpm run check
pnpm run build
```

This repository intentionally commits `dist/` because GitHub Actions run the
compiled JavaScript directly. If you change TypeScript sources under `src/`,
make sure the generated `dist/` output stays in sync.

## Repository Conventions

- treat `action.yml` as the primary public interface
- keep `docs/API-SPEC.md` aligned with consumer-visible behavior
- prefer focused tests for contract changes and branching behavior
- keep the runtime action thin; push logic into testable modules under `src/`

## Pull Request Checklist

- update tests when public behavior or branching logic changes
- run `pnpm run check`
- run `pnpm run build`
- review `dist/` changes for expected output only
- update `CHANGELOG.md` when the public contract changes
