---
name: sync-docs
description: >
  ドキュメント更新時に翻訳版・関連ドキュメントへ変更を効率的に伝播する。
  英語ドキュメントを正とし、日本語翻訳および関連箇所を同期する。
autorun: false
---

# sync-docs: ドキュメント同期スキル

ドキュメントを更新した際に、翻訳版および関連ドキュメントへ変更を効率的に反映するスキル。

## 引数

- `<file>`: 更新済みのドキュメントファイルパス（省略時は git diff で自動検出）

## ドキュメントマップ

このプロジェクトのドキュメント対応関係:

| 英語 (正) | 日本語訳 |
|---|---|
| `README.md` | `README.ja.md` |
| `docs/API-SPEC.md` | `docs/API-SPEC.ja.md` |
| `docs/CONSUMER-GUIDE.md` | `docs/CONSUMER-GUIDE.ja.md` |

関連ドキュメント（変更内容に応じて更新が必要になる場合がある）:
- `action.yml` — inputs/outputs の公式定義。ここが変わったら README と API-SPEC の両言語を更新
- `CHANGELOG.md` — 公開動作の変更時に更新
- `examples/consumer-workflow.yml` — ワークフロー例。CONSUMER-GUIDE の両言語で参照
- `AGENTS.md` — メンテナンスガイド。テスト手順・PR手順・リリース手順の変更時に更新

## 実行手順

### Step 1: 変更の検出

引数でファイルが指定されていればそれを使う。指定がなければ以下で検出:

```
git diff --name-only HEAD -- '*.md' 'action.yml' 'examples/'
git diff --cached --name-only -- '*.md' 'action.yml' 'examples/'
```

変更されたドキュメントファイルを特定する。

### Step 2: 変更内容の分析

変更されたファイルの diff を読み、以下を判断する:

1. **何が変わったか**: セクション追加・削除・修正、テーブル変更、コード例変更、リンク変更
2. **翻訳に影響するか**: コード例やURLのみの変更は翻訳不要でそのまま適用。文章の変更は翻訳が必要
3. **関連ドキュメントに波及するか**: inputs/outputs の変更は README と API-SPEC の両方に影響

### Step 3: 翻訳ペアの同期

変更元ファイルに対応する翻訳ファイルを特定し、以下のルールで同期する:

**英語 → 日本語の場合（通常フロー）:**
1. 英語ファイルの変更箇所を特定
2. 対応する日本語ファイルの同じセクションを見つける
3. 変更内容を日本語に翻訳して適用
4. コードブロック・YAML例・URL・変数名はそのまま維持（翻訳しない）

**日本語 → 英語の場合（逆方向）:**
1. 日本語ファイルの変更が英語版にない新規内容か確認
2. 新規内容であれば英語版にも反映を提案
3. 既存内容の翻訳修正のみなら英語版は変更不要

### Step 4: 関連ドキュメントへの波及

以下の波及ルールを確認し、該当する場合は関連ドキュメントも更新する:

| 変更元 | 波及先 | 条件 |
|---|---|---|
| `action.yml` | README (en/ja), API-SPEC (en/ja) | inputs/outputs/description の変更 |
| `README.md` | `README.ja.md` | 常に |
| `docs/API-SPEC.md` | `docs/API-SPEC.ja.md` | 常に |
| `docs/CONSUMER-GUIDE.md` | `docs/CONSUMER-GUIDE.ja.md` | 常に |
| README の inputs/outputs テーブル | API-SPEC の対応テーブル | テーブル内容の変更 |
| API-SPEC の failure conditions | CONSUMER-GUIDE の troubleshooting | エラーメッセージの変更 |
| `examples/consumer-workflow.yml` | CONSUMER-GUIDE (en/ja) のコード例 | ワークフロー例の変更 |

### Step 5: 整合性チェック

すべての更新が完了したら、以下を確認:

1. **相互リンクの整合性**: 各ドキュメント冒頭の言語切替リンクが正しいか
2. **セクション構造の一致**: 英語版と日本語版で同じセクション構成になっているか
3. **コード例の一致**: 両言語でコードブロックの内容が同一か
4. **テーブルの一致**: inputs/outputs テーブルの値が全ドキュメントで一致しているか

### Step 6: 変更サマリーの出力

更新した内容をユーザーに以下の形式で報告:

```
## ドキュメント同期結果

### 変更元
- `<ファイル>`: <変更概要>

### 同期先
- `<ファイル>`: <適用した変更>
- `<ファイル>`: <適用した変更>

### 未対応（手動確認が必要）
- <該当があれば記載>
```

## 翻訳スタイルガイド

- 技術用語は初出時に英語を併記: 例「ロックファイル（lockfile）」
- GitHub Actions 固有の用語は英語のまま: `step`, `job`, `workflow`, `inputs`, `outputs`
- コマンド名・ファイル名・変数名は翻訳しない
- 「です・ます」調で統一
- 各日本語ドキュメントの冒頭に英語版へのリンクを維持: `英語版: [ファイル名](パス)`
- 各英語ドキュメントの冒頭に日本語版へのリンクを維持
