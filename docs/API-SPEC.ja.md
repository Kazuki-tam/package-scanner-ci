# PackageScanner GitHub Action 仕様書

英語版: [docs/API-SPEC.md](API-SPEC.md)

## 1. 目的

この文書は、このリポジトリに含まれる PackageScanner GitHub Action の公開挙動を説明します。

この Action は、リポジトリの依存関係マニフェストファイルを読み取り、その内容を PackageScanner の解析エンドポイントへ送信し、小さな要約結果を workflow outputs として公開します。

このリポジトリは公開前提であるため、この文書では Action の公開契約に焦点を当てます。

- どのファイルを Action が読むか
- どの inputs / outputs をサポートするか
- どのデータを送信するか
- どのようなときに step が失敗するか
- 利用者が何に依存してよいか

内部バックエンドのレスポンス schema 全体を固定化することは目的としていません。

## 2. スコープ

この Action は Composite Action であり、次を行います。

- チェックアウト済み workspace から `package.json` と対応ロックファイルを解決する
- PackageScanner サービス向けの JSON リクエストを組み立てる
- HTTPS `POST` で送信する
- 要約値を GitHub Actions outputs に書き込む
- 必要に応じて、マルウェア検出時に step を失敗させる

この Action 自体はローカルでパッケージ解析を行いません。

## 3. 対応ファイル

対応ファイル:

- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `pnpm-lock.yml`
- `yarn.lock`
- `bun.lock`

非対応:

- `bun.lockb`

ロックファイル自動検出順:

1. `package-lock.json`
2. `pnpm-lock.yaml`
3. `pnpm-lock.yml`
4. `yarn.lock`
5. `bun.lock`

補足:

- `lockfile` を省略した場合、Action は `working-directory` 配下で対応ロックファイルの自動検出を試みます。
- `package-json` を省略した場合、`working-directory` に `package.json` が存在すればそれを読み取ります。
- Action の実行には、`package.json` または対応ロックファイルのいずれか少なくとも 1 つが必要です。
- `working-directory`、`lockfile`、`package-json` は GitHub workspace 内に解決される必要があります。絶対パスや workspace 外へのパストラバーサルは拒否されます。

## 4. 実行要件

- この Action の前に `actions/checkout` を実行していること
- runner 上で Node.js `18.17+` が利用可能であること
- self-hosted runner では `node` が `PATH` にあること
- workflow から `https://www.package-scanner.dev` へ外向き HTTPS 通信ができること

## 5. 公開 Inputs

次の inputs は `action.yml` で定義されており、Action の公開インターフェースの一部です。

| Name                             | Type                                         | Required | Default   | Description                                                                                              |
| -------------------------------- | -------------------------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `working-directory`              | string                                       | No       | `.`       | `lockfile` と `package.json` を解決する基準ディレクトリです。                                            |
| `lockfile`                       | string                                       | No       | `""`      | `working-directory` からの相対パスで指定するロックファイルです。未指定時は自動検出されます。             |
| `package-json`                   | string                                       | No       | `""`      | `working-directory` からの相対パスで指定する `package.json` です。未指定時は `package.json` を使います。 |
| `package-manager`                | `npm \| pnpm \| yarn \| bun`                 | No       | `""`      | ロックファイル名から package manager を推定できない場合の任意の上書き指定です。                          |
| `fail-on-malware`                | string                                       | No       | `"true"`  | `"false"` を指定すると、マルウェア検出時も step は成功のままになります。                                 |
| `fail-on-vulnerability-severity` | `off \| low \| moderate \| high \| critical` | No       | `"high"`  | step を失敗させる最小の脆弱性重大度です。`high` は `high` と `critical` を意味します。                   |
| `enable-metadata-check`          | string                                       | No       | `"false"` | `"true"` を指定すると追加の npm metadata check を要求します。`package.json` が必要です。                 |

## 6. 公開 Outputs

この Action は次の outputs を公開します。

| Name                           | Type   | Description                   |
| ------------------------------ | ------ | ----------------------------- |
| `analysis-id`                  | string | サービスが返した analysis ID  |
| `malware-count`                | string | マルウェア検出件数            |
| `vulnerability-count`          | string | 脆弱性検出件数                |
| `vulnerability-unknown-count`  | string | 重大度不明の脆弱性件数        |
| `vulnerability-low-count`      | string | `low` 重大度の脆弱性件数      |
| `vulnerability-moderate-count` | string | `moderate` 重大度の脆弱性件数 |
| `vulnerability-high-count`     | string | `high` 重大度の脆弱性件数     |
| `vulnerability-critical-count` | string | `critical` 重大度の脆弱性件数 |

補足:

- これらの値は `GITHUB_OUTPUT` を通じて書き込まれます。
- `vulnerability-count` は、レスポンスに summary があればそこから導出し、なければ返却された脆弱性配列の長さにフォールバックします。
- 重大度別件数は正規化済みの脆弱性重大度から算出されます。
- `GITHUB_STEP_SUMMARY` が利用可能な場合は、人が読みやすい CI 出力として Markdown の要約表も書き込みます。

## 7. Action が送信する内容

この Action は次のエンドポイントへ JSON リクエストを送信します。

- `POST https://www.package-scanner.dev/api/ci/analyze`

リクエストヘッダ:

```http
Content-Type: application/json
Accept: application/json
```

リクエストボディ形状:

```json
{
  "lockfileContent": "string, optional",
  "manager": "npm | pnpm | yarn | bun, optional",
  "packageJsonContent": "string, optional",
  "options": {
    "enableMetadataCheck": true
  }
}
```

挙動:

- `lockfileContent` は、対応ロックファイルが見つかった場合または明示指定された場合に含まれます
- `manager` は `lockfileContent` と一緒に含まれます
- `packageJsonContent` は、`package.json` が見つかった場合または明示指定された場合に含まれます
- `options.enableMetadataCheck` は `enable-metadata-check: "true"` のときだけ含まれます

送信前に Action が強制する検証ルール:

- `lockfileContent` または `packageJsonContent` のどちらか少なくとも 1 つが必要です
- ロックファイルを送る場合、package manager が判明している必要があります
- これとは別にサーバ側の検証が行われる可能性があります

脆弱性の失敗しきい値:

- Action は、利用可能な場合に返却された脆弱性重大度を検査します
- 利用可能なしきい値は `off`、`low`、`moderate`、`high`、`critical` です
- デフォルトしきい値は `high` です
- 重大度の別名は正規化され、`medium` は `moderate` として扱われます

## 8. 公開利用者向けのデータ取り扱い

このリポジトリは公開されているため、利用者はこの Action 実行時に CI 環境からどのデータが外へ出るのかを正確に理解しておく必要があります。

送信される可能性があるデータ:

- 対応ロックファイルの生内容
- `package.json` の生内容
- 推定または設定された package manager
- metadata-check フラグ

この Action は GitHub workspace 外の任意ファイルを読み取りません。

依存関係メタデータは常に `https://www.package-scanner.dev` 上のホスト版 PackageScanner サービスへ送信されます。

## 9. 失敗条件

この Action は次の状況で失敗します。

- 設定したロックファイルパスが存在しない
- ロックファイルはあるが package manager を判定できない
- 対応ロックファイルも `package.json` も存在しない
- API が JSON または非 JSON の body を伴う非成功ステータスを返した
- HTTP レスポンスが成功扱いでも JSON として不正だった
- `fail-on-vulnerability-severity` 以上の脆弱性が返された
- マルウェアが検出され、かつ `fail-on-malware` が `"false"` ではない

代表的なエラーメッセージ:

- `PackageScanner: lockfile not found: ...`
- `PackageScanner: could not determine package manager. Set package-manager input (npm, pnpm, yarn, or bun).`
- `PackageScanner: no lockfile or package.json found. Commit a lockfile or package.json, or set inputs.`
- `PackageScanner: working-directory must stay within the GitHub workspace.`
- `PackageScanner: lockfile path must stay within the GitHub workspace.`
- `PackageScanner: request failed (500) with JSON response.`
- `PackageScanner: request failed (502) with non-JSON response.`
- `PackageScanner: response was not valid JSON.`
- `PackageScanner: blocking vulnerabilities detected at or above high: 1`
- `PackageScanner: malicious packages detected: 1`

## 10. Action が利用するレスポンス契約

バックエンドサービスは、Action が必要とする以上のフィールドを返す可能性があります。公開ドキュメントとして安定契約とみなすべきなのは、Action が実際に利用している部分集合だけです。

Action は、次の値を提供しうる JSON レスポンスを想定しています。

```json
{
  "analysisId": "string",
  "malware": [],
  "vulnerabilities": [],
  "summary": {
    "total": 0,
    "vulnerabilityCount": 0
  }
}
```

Action における利用方法:

- `analysisId` -> `analysis-id`
- `malware.length` -> `malware-count`
- `summary.vulnerabilityCount` または `vulnerabilities.length` -> `vulnerability-count`
- 正規化済みの重大度バケット -> `vulnerability-unknown-count`、`vulnerability-low-count`、`vulnerability-moderate-count`、`vulnerability-high-count`、`vulnerability-critical-count`
- `summary.total` -> コンソール要約のみに利用し、正式な Action output には含めない

この Action の利用者は、バックエンドレスポンス全体ではなく、文書化された outputs に依存してください。

## 11. ワークフロー例

```yaml
permissions:
  contents: read

jobs:
  package-scanner:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - id: scan
        uses: Kazuki-tam/package-scanner-ci@v1
        with:
          working-directory: "."
          fail-on-malware: "true"
          fail-on-vulnerability-severity: "high"
          enable-metadata-check: "false"

      - run: |
          echo "analysis=${{ steps.scan.outputs.analysis-id }}"
          echo "unknown=${{ steps.scan.outputs.vulnerability-unknown-count }}"
          echo "low=${{ steps.scan.outputs.vulnerability-low-count }}"
          echo "moderate=${{ steps.scan.outputs.vulnerability-moderate-count }}"
          echo "high=${{ steps.scan.outputs.vulnerability-high-count }}"
          echo "critical=${{ steps.scan.outputs.vulnerability-critical-count }}"
```

## 12. 互換性とバージョニング

- 利用者は `Kazuki-tam/package-scanner-ci@v1` のようなメジャータグを参照してください
- 互換性を壊す変更は `v2` のような新しいメジャータグでリリースすべきです
- 後方互換のある変更は既存メジャー系列内でリリースできます
- 公開ドキュメントは `action.yml` と、`src/entrypoints/action.ts` および `src/application/run-package-scanner-action.ts` の実行時挙動に合わせておく必要があります

## 13. メンテナ向けメモ

このリポジトリを更新するときは:

- `action.yml` の inputs / outputs を最優先の公開 API として扱う
- この文書は利用者から見える挙動に集中させる
- Action が本当に依存しているのでない限り、内部専用のバックエンドフィールドを文書化しない
- 公開 inputs を追加または変更したら examples も更新する
