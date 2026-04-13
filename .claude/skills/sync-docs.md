---
name: sync-docs
description: >
  Propagate documentation changes to translated versions and related documents.
  Treats English documents as the source of truth and syncs Japanese translations.
autorun: false
---

# sync-docs: Documentation Sync Skill

Propagate documentation updates to their translated counterparts and related documents efficiently.

## Arguments

- `<file>`: Path to the updated document file (omit to auto-detect from git diff)

## Document Map

Translation pairs in this project:

| English (source of truth) | Japanese translation        |
| ------------------------- | --------------------------- |
| `README.md`               | `README.ja.md`              |
| `docs/API-SPEC.md`        | `docs/API-SPEC.ja.md`       |
| `docs/CONSUMER-GUIDE.md`  | `docs/CONSUMER-GUIDE.ja.md` |

Related documents that may need updates depending on the change:

- `action.yml` — canonical definition of inputs/outputs. Changes here require updates to README and API-SPEC in both languages
- `CHANGELOG.md` — update when public behavior changes
- `examples/consumer-workflow.yml` — workflow examples referenced by CONSUMER-GUIDE in both languages
- `AGENTS.md` — maintenance guide. Update when testing, PR, or release procedures change

## Procedure

### Step 1: Detect Changes

Use the file argument if provided. Otherwise, auto-detect:

```
git diff --name-only HEAD -- '*.md' 'action.yml' 'examples/'
git diff --cached --name-only -- '*.md' 'action.yml' 'examples/'
```

Identify which documentation files have changed.

### Step 2: Analyze Changes

Read the diff of each changed file and determine:

1. **What changed**: section additions/removals/edits, table changes, code example changes, link changes
2. **Does it affect translations?**: code-only or URL-only changes can be applied as-is without translation. Prose changes require translation
3. **Does it cascade to related docs?**: inputs/outputs changes affect both README and API-SPEC

### Step 3: Sync Translation Pairs

Identify the translation counterpart for each changed file and sync using these rules:

**English → Japanese (normal flow):**

1. Identify the changed sections in the English file
2. Locate the corresponding sections in the Japanese file
3. Translate the changes into Japanese and apply
4. Keep code blocks, YAML examples, URLs, and variable names unchanged (do not translate)

**Japanese → English (reverse flow):**

1. Check if the Japanese change contains new content not in the English version
2. If so, propose reflecting it in the English version
3. If it is only a translation fix, no English changes needed

### Step 4: Cascade to Related Documents

Check the following cascade rules and update related documents when applicable:

| Source                           | Cascade targets                      | Condition                          |
| -------------------------------- | ------------------------------------ | ---------------------------------- |
| `action.yml`                     | README (en/ja), API-SPEC (en/ja)     | inputs/outputs/description changed |
| `README.md`                      | `README.ja.md`                       | always                             |
| `docs/API-SPEC.md`               | `docs/API-SPEC.ja.md`                | always                             |
| `docs/CONSUMER-GUIDE.md`         | `docs/CONSUMER-GUIDE.ja.md`          | always                             |
| README inputs/outputs tables     | API-SPEC corresponding tables        | table content changed              |
| API-SPEC failure conditions      | CONSUMER-GUIDE troubleshooting       | error messages changed             |
| `examples/consumer-workflow.yml` | CONSUMER-GUIDE (en/ja) code examples | workflow example changed           |

### Step 5: Consistency Check

After all updates are complete, verify:

1. **Cross-links**: language-switcher links at the top of each document are correct
2. **Section structure**: English and Japanese versions have matching section hierarchy
3. **Code examples**: code blocks are identical across both languages
4. **Tables**: inputs/outputs table values are consistent across all documents

### Step 6: Output Summary

Report all updates to the user in the following format:

```
## Documentation Sync Results

### Source
- `<file>`: <change summary>

### Synced
- `<file>`: <applied changes>
- `<file>`: <applied changes>

### Needs Manual Review
- <list if applicable>
```

## Translation Style Guide

- Include English in parentheses on first use of technical terms: e.g. "lockfile" → "ロックファイル（lockfile）"
- Keep GitHub Actions terminology in English: `step`, `job`, `workflow`, `inputs`, `outputs`
- Do not translate command names, file names, or variable names
- Use polite form (です・ます) consistently in Japanese
- Maintain a link to the English version at the top of each Japanese document: `英語版: [filename](path)`
- Maintain a link to the Japanese version at the top of each English document
