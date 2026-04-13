# PackageScanner GitHub Action

英語版: [README.md](README.md)

リポジトリ内の対応ロックファイルおよび `package.json` を
PackageScanner CI API に送信するための GitHub Action です。

ホスト版 PackageScanner サービスは
`https://www.package-scanner.dev` で提供されており、製品概要は
`https://www.package-scanner.dev/ja` で確認できます。

## この Action が行うこと

- チェックアウト済みワークスペースから `package.json` と対応ロックファイルを読み取ります
- それらの生データを `POST https://www.package-scanner.dev/api/ci/analyze` に送信します
- `analysis-id`、`malware-count`、`vulnerability-count`、および重大度別の脆弱性件数を出力します
- デフォルトでは、マルウェアまたは `high` / `critical` の脆弱性が見つかったときに step を失敗させます

この Action 自体がローカルで依存関係を解析するわけではありません。PackageScanner サービス向けの薄い CI クライアントとして動作します。

## クイックスタート

```yaml
permissions:
  contents: read

jobs:
  package-scanner:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1

      - run: |
          echo "analysis=${{ steps.scan.outputs.analysis-id }}"
          echo "malware=${{ steps.scan.outputs.malware-count }}"
          echo "vulns=${{ steps.scan.outputs.vulnerability-count }}"
          echo "low=${{ steps.scan.outputs.vulnerability-low-count }}"
          echo "moderate=${{ steps.scan.outputs.vulnerability-moderate-count }}"
          echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
          echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

より完全なワークフロー例は `examples/consumer-workflow.yml` にあります。
セットアップ手順を順番に確認したい場合は `docs/CONSUMER-GUIDE.ja.md` を参照してください。

## Inputs

| Input                            | 説明                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `working-directory`              | ロックファイルと `package.json` を解決する基準ディレクトリです。デフォルトは `.` です。                                                                                             |
| `lockfile`                       | `working-directory` からの相対パスで指定する任意のロックファイルです。未指定時は `package-lock.json`、`pnpm-lock.yaml`、`pnpm-lock.yml`、`yarn.lock`、`bun.lock` を自動検出します。 |
| `package-json`                   | `working-directory` からの相対パスで指定する任意の `package.json` です。ファイルが存在する場合はデフォルトで `package.json` を読みます。                                            |
| `package-manager`                | ロックファイル名から判定できない場合に `npm`、`pnpm`、`yarn`、`bun` を明示指定します。                                                                                              |
| `fail-on-malware`                | マルウェアが見つかっても step を成功扱いにしたい場合は `false` を指定します。デフォルトは `true` です。                                                                             |
| `fail-on-vulnerability-severity` | step を失敗させる最小の脆弱性重大度です。`off`、`low`、`moderate`、`high`、`critical` を指定でき、デフォルトは `high` です。                                                        |
| `enable-metadata-check`          | npm メタデータの追加チェックを含める場合は `true` を指定します。`package.json` が必要です。デフォルトは `false` です。                                                              |

## Outputs

- `analysis-id`
- `malware-count`
- `vulnerability-count`
- `vulnerability-low-count`
- `vulnerability-moderate-count`
- `vulnerability-high-count`
- `vulnerability-critical-count`

`GITHUB_STEP_SUMMARY` が利用可能な場合、この Action は GitHub Actions の job summary に Markdown の要約も書き込みます。

PR コメントに使う例:

```yaml
- uses: actions/github-script@v7
  if: github.event_name == 'pull_request'
  with:
    script: |
      const body = [
        "## PackageScanner",
        `- Malware: ${{ steps.scan.outputs.malware-count }}`,
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

## 失敗条件

デフォルトでは、次のいずれかに当てはまると Action の step は失敗します。

- マルウェア検出結果が存在する
- `high` または `critical` の脆弱性が 1 件以上存在する

脆弱性による失敗条件は `fail-on-vulnerability-severity` で調整できます。

- `off`: 脆弱性では失敗させない
- `low`: どの脆弱性でも失敗させる
- `moderate`: `moderate`、`high`、`critical` で失敗させる
- `high`: `high` または `critical` で失敗させる
- `critical`: `critical` のみで失敗させる

重大度別の出力があるため、PR コメント、Slack 通知、独自のデプロイゲートなどに流用しやすくなっています。

## PackageScanner に送信されるデータ

この Action が実行されると、次のデータが送信される可能性があります。

- 対応ロックファイルの生内容
- `package.json` の生内容
- 推定または設定されたパッケージマネージャ
- `enable-metadata-check` フラグ

この Action は常に `https://www.package-scanner.dev` 上のホスト版 PackageScanner サービスへデータを送信します。

安全のため、`working-directory`、`lockfile`、`package-json` はチェックアウト済み GitHub workspace 内に解決されなければなりません。絶対パスや workspace 外へのパストラバーサルは拒否されます。

## 要件

- リポジトリのファイルを参照できるように、この Action より先に `actions/checkout` を実行してください
- self-hosted runner では `node` が `PATH` 上に存在する必要があります
- ランタイムは組み込みの Fetch API に依存するため、Node `18.17+` を使用してください
- `https://www.package-scanner.dev` への外向き HTTPS 通信を許可してください

## 公開契約

このリポジトリの主要な公開インターフェースは `action.yml` で定義された GitHub Action です。

利用者向けの挙動は、次の文書で説明しています。

- `action.yml`
- `docs/CONSUMER-GUIDE.ja.md`
- `docs/API-SPEC.ja.md`
- `examples/consumer-workflow.yml`

`src/` 配下の TypeScript ソースは保守しやすいように整理されていますが、ワークフロー利用者が直接依存すべき互換性契約ではありません。

## ローカル開発

```bash
pnpm install
pnpm run check
pnpm run build
```

このリポジトリで使っている主なツール:

- `strict` モードの TypeScript
- ユニットテスト用の Vitest
- Lint と format 用の Oxc (`oxlint` と `oxfmt`)

## リポジトリ構成

- `action.yml`: Action のメタデータと公開 inputs / outputs
- `src/entrypoints`: ランタイムの entrypoint
- `src/application`: Action のオーケストレーション
- `src/domain`: ロックファイル検出と package manager ルール
- `src/infrastructure`: ファイル解決、API リクエスト整形、出力処理
- `src/support`: テスト用の小さな依存性注入ヘルパー
- `dist/`: GitHub Actions ランタイム用にコミットされるコンパイル済み JavaScript
- `docs/`: 利用者向けの挙動と保守用ドキュメント
- `examples/`: そのまま使えるワークフロー例

## メンテナ向け

リリースタグを切る前に:

1. `pnpm run check` を実行する
2. `pnpm run build` を実行する
3. 生成された `dist/` の差分を確認する
4. 公開挙動が変わった場合は `CHANGELOG.md` を更新する
5. `v1` のようなメジャータグを publish または移動する

追加のメンテナ向け文書:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
