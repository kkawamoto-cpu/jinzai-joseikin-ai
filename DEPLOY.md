# デプロイ手順（Vercel + Neon + GitHub）

所要時間：約15分。すべてブラウザで完結します。

---

## Step 1: Neon（PostgreSQL）をセットアップ（3分）

1. <https://neon.tech> にアクセス → **Sign up**（GitHubアカウント連携が最速）
2. 新規プロジェクト作成
   - Project name: `jinzai-joseikin-ai`
   - Region: `AWS Tokyo (ap-northeast-1)` 推奨
   - Postgres version: 16
3. **ダッシュボードの「Connection Details」** から接続文字列をコピー
   - `Pooled connection` のほう（例: `postgresql://xxx:xxx@ep-xxx-pooler.ap-northeast-1.aws.neon.tech/neondb?sslmode=require`）
   - ⚠ この値は **Vercelに貼り付けるのでメモ帳等に保管**

---

## Step 2: GitHubリポジトリ作成 & push（3分）

1. <https://github.com/new> で新規リポジトリ作成
   - Repository name: `jinzai-joseikin-ai`
   - **Private** でOK（Vercelから参照可能）
   - **README / .gitignoreは追加しない**（既に用意してあります）
2. 表示される手順のうち、`…or push an existing repository from the command line` を使います。
3. ターミナルで以下を実行（`<YOUR_USERNAME>` をご自分のGitHubユーザー名に置換）：

```bash
cd "/Users/koheikawamoto/Desktop/Claude Code/人材開発支援助成金申請AI/app"
git remote add origin https://github.com/<YOUR_USERNAME>/jinzai-joseikin-ai.git
git push -u origin main
```

- Username / Password を聞かれたら：
  - Username: GitHubユーザー名
  - Password: **Personal Access Token（PAT）** を入力
    - PAT作成: <https://github.com/settings/tokens> → Generate new token (classic) → `repo` スコープのみ → Generate
    - もしくは macOS Keychain に登録しておくと以降自動になります

---

## Step 3: Vercelにインポート（5分）

1. <https://vercel.com/signup> → **Continue with GitHub**
2. 初回は「GitHubリポジトリへのアクセス許可」画面が出るので、`jinzai-joseikin-ai` リポジトリへのアクセスを許可
3. ダッシュボードの **Add New → Project** をクリック
4. `jinzai-joseikin-ai` を **Import**
5. 設定画面で以下を入力：
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: そのまま（`./`）
   - **Build Command**: 自動検出されたものでOK（`npm run vercel-build` が使われます）
   - **Environment Variables**（必ず設定）:
     | Name | Value |
     | --- | --- |
     | `DATABASE_URL` | Step1でコピーしたNeonの接続文字列 |
     | `AUTH_SECRET` | 任意のランダム文字列（例: `openssl rand -hex 32` の出力） |
6. **Deploy** をクリック → 完了を待つ（2〜3分）

ビルドログに `Applied X migrations` と表示されれば成功です。デプロイ完了後、`https://jinzai-joseikin-ai-xxx.vercel.app` のようなURLが発行されます。

---

## Step 4: 本番DBにseedを投入（2分）

Vercelではseedが自動実行されないため、ローカルから本番DBに対して seed を実行します。

```bash
cd "/Users/koheikawamoto/Desktop/Claude Code/人材開発支援助成金申請AI/app"

# 本番DBの接続文字列で一時的に .env を上書きして seed
DATABASE_URL="<NeonのDATABASE_URL>" npm run db:seed
```

成功すると以下が投入されます：
- 管理者1名（admin@example.com）
- 顧客企業ユーザー1名（client@example.com）
- 社労士1名（sharoushi@example.com）
- 研修事業者1名（provider@example.com）
- 案件2件＋ダミーデータ一式
- パスワードは全て `password`

---

## Step 5: ログインして動作確認（1分）

1. VercelのURL（`https://xxx.vercel.app`）を開く
2. 以下でログイン：
   - Email: `client@example.com`
   - Password: `password`
3. 案件一覧 → 詳細 → Step1〜10 の動作を確認
4. Step8 「AIチェックを実行」、Step9 「一括ドラフト生成」、Step10 「引継ぎパッケージダウンロード」が動くことを確認

---

## トラブルシューティング

### ビルドが `prisma migrate deploy` でエラー
- **原因**: `DATABASE_URL` がVercel環境変数に設定されていない、または値が間違っている
- **対処**: Vercel → Settings → Environment Variables を確認して再デプロイ

### ログインすると 500 エラー
- **原因**: 本番DBにテーブルが作成されているが、seedが未投入
- **対処**: Step4のseedコマンドを実行

### ファイルアップロードしても再読込すると消える
- **仕様**: Vercelのサーバーレス環境では `/tmp` が一時ディレクトリのため再起動で消えます
- **本番対応**: S3/R2/GCSなどのオブジェクトストレージに差し替え（`src/app/api/projects/[id]/files/route.ts` を書き換え）

### Prismaのバイナリエラー
- **対処**: `prisma/schema.prisma` の `binaryTargets` に `"rhel-openssl-3.0.x"` が含まれていることを確認（対応済み）

---

## 本番移行時のセキュリティ注意

- [ ] seedデータのテストアカウントを無効化・削除する
- [ ] `AUTH_SECRET` を十分ランダムな値に変更
- [ ] カスタムドメインを設定（Vercel → Settings → Domains）
- [ ] 認証をNextAuth/Auth.js等に差し替え
- [ ] ファイルストレージをS3等に切替
- [ ] AI関数を実際のLLM APIに接続（`src/lib/ai.ts`）
