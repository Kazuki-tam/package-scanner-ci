# PackageScanner 利用者ガイド

英語版: [docs/CONSUMER-GUIDE.md](CONSUMER-GUIDE.md)

このガイドは、自分たちのリポジトリから公開版 PackageScanner GitHub Action を利用したいチーム向けの文書です。

正式な公開契約が必要な場合は `action.yml` と `docs/API-SPEC.ja.md` を参照してください。この文書は、実践的なセットアップと日常的な使い方に重点を置いています。

## 何が得られるか

この Action をワークフローで実行すると、次のことが行われます。

- リポジトリ内の対応ロックファイルおよび `package.json` を読み取る
- その依存関係メタデータをホスト版 PackageScanner サービスへ送信する
- スキャン結果の要約値を GitHub Actions の outputs として公開する
- マルウェアやブロッキング対象の脆弱性が見つかった場合にワークフローを失敗させられる

対応ロックファイル:

- `package-lock.json`
- `pnpm-lock.yaml`
- `pnpm-lock.yml`
- `yarn.lock`
- `bun.lock`

## 追加前の確認事項

ワークフロー環境が次の条件を満たしていることを確認してください。

- この Action より先に `actions/checkout` が実行される
- runner に Node.js `18.17+` が入っている
- runner が `https://www.package-scanner.dev` へ HTTPS で接続できる

通常の GitHub-hosted runner であれば、checkout 以外に特別な準備はほぼ不要です。

## 最小構成

依存関係ファイルが変更されたときにスキャンする最小構成の例です。

```yaml
name: PackageScanner

on:
  pull_request:
    paths:
      - "package.json"
      - "package-lock.json"
      - "pnpm-lock.yaml"
      - "pnpm-lock.yml"
      - "yarn.lock"
      - "bun.lock"

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
```

デフォルトでは、この Action は次のように動作します。

- リポジトリルート配下から対応ロックファイルを自動検出する
- `package.json` が存在すれば読み取る
- マルウェアが見つかると失敗する
- 重大度 `high` または `critical` の脆弱性が見つかると失敗する

## よくある設定

リポジトリ構成や運用ポリシーに応じて細かく制御したい場合は、`with:` inputs を使います。

### サブディレクトリをスキャンする

monorepo やサブフォルダ配置のアプリで最もよくある設定です。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    working-directory: "apps/web"
```

### ロックファイルを明示する

自動検出では不十分な場合や、明示指定したい場合に使います。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    working-directory: "."
    lockfile: "pnpm-lock.yaml"
```

### パッケージマネージャを上書きする

通常はロックファイル名から自動判定されます。自分たちの構成では推定できない場合だけ手動指定してください。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    lockfile: "custom/path/to/lockfile"
    package-manager: "pnpm"
```

### 失敗しきい値を変える

`fail-on-vulnerability-severity` input で、どの重大度以上の脆弱性を step 失敗扱いにするかを制御できます。

- `off`: 脆弱性では失敗させない
- `low`: どの脆弱性でも失敗させる
- `moderate`: `moderate`、`high`、`critical` で失敗させる
- `high`: `high` または `critical` で失敗させる
- `critical`: `critical` のみで失敗させる

例:

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-vulnerability-severity: "critical"
```

マルウェアは検出したいがワークフローをブロックしたくない場合は、次のように設定します。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-malware: "false"
```

### メタデータチェックを有効にする

追加の npm メタデータチェックを要求する場合は `enable-metadata-check: "true"` を指定します。これには `package.json` が必要です。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    enable-metadata-check: "true"
```

## Outputs の使い方

この Action は次の outputs を公開します。

- `analysis-id`
- `malware-count`
- `vulnerability-count`
- `vulnerability-unknown-count`
- `vulnerability-low-count`
- `vulnerability-moderate-count`
- `vulnerability-high-count`
- `vulnerability-critical-count`

後続 step でレポートやワークフロー制御に利用できます。

例:

```yaml
- name: Print scan summary
  run: |
    echo "analysis=${{ steps.scan.outputs.analysis-id }}"
    echo "malware=${{ steps.scan.outputs.malware-count }}"
    echo "vulns=${{ steps.scan.outputs.vulnerability-count }}"
    echo "unknown=${{ steps.scan.outputs.vulnerability-unknown-count }}"
    echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
    echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

`GITHUB_STEP_SUMMARY` が利用可能な場合、この Action は GitHub Actions の job summary に Markdown の要約も書き込みます。

## 例: monorepo のパッケージスキャン

```yaml
name: PackageScanner

on:
  pull_request:
    paths:
      - "apps/web/package.json"
      - "apps/web/pnpm-lock.yaml"

permissions:
  contents: read

jobs:
  scan-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          working-directory: "apps/web"
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "true"
```

## 例: 1日1回の定期スキャン

ロックファイルに最近変更がなくても、新しく公開されたマルウェアや脆弱性を拾いたい場合に有効です。

```yaml
name: PackageScanner Daily Check

on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "true"
```

GitHub Actions の `schedule` は UTC 基準です。チームの運用に合わせて cron を調整してください。

## リポジトリ外へ出るデータ

この Action はホスト版 PackageScanner サービス向けの薄いクライアントであり、依存関係解析をローカルでは行いません。

実行時に送信される可能性があるデータ:

- 対応ロックファイルの生内容
- `package.json` の生内容
- 推定または設定されたパッケージマネージャ
- metadata-check フラグ

パスはチェックアウト済み GitHub workspace 内に収まっていなければなりません。絶対パスや workspace 外へのパストラバーサルは拒否されます。

## トラブルシューティング

### ファイルが見つからない

Action がロックファイルや `package.json` を見つけられないと報告した場合:

- `actions/checkout` が scan step より前に実行されているか確認する
- 対象ファイルがチェックアウト済み workspace に存在するか確認する
- リポジトリルート以外に置いている場合は `working-directory`、`lockfile`、`package-json` を明示する

### パッケージマネージャを判定できない

標準的でないロックファイルのパスや名前を使っている場合は、`package-manager` を次のいずれかで明示してください。

- `npm`
- `pnpm`
- `yarn`
- `bun`

### ワークフローが想定外に失敗する

次のどれが原因かを確認してください。

- ブロッキング対象の脆弱性しきい値
- マルウェア検出
- ネットワークまたは API エラー
- GitHub workspace 外を指す不正なファイルパス

まずは非ブロッキングで導入したい場合、次の設定から始められます。

```yaml
- id: scan
  uses: Kazuki-tam/package-scanner-ci@v1
  with:
    fail-on-malware: "false"
    fail-on-vulnerability-severity: "off"
```

スキャン結果にチームが慣れてきたら、しきい値を徐々に厳しくしてください。
