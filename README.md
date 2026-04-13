# 人材開発支援助成金申請AI

人材開発支援助成金（事業展開等リスキリング支援コース）の **申請準備** を支援するSaaS Webアプリです。顧客企業・研修事業者・社会保険労務士が共通の場でフォーム入力を進め、AIが要件判定・不足書類チェック・文章ドラフト生成を行い、最後に社労士へ引き継ぎます。

> ⚠ 本システムは **申請準備支援システム** であり、正式な助成金申請書の作成・提出代行は行いません。最終的な申請は社会保険労務士が実施する前提で設計されています。

---

## 1. 使用技術

| 区分 | 技術 |
| --- | --- |
| フロントエンド | Next.js 14 (App Router) / React 18 / TypeScript |
| UI | Tailwind CSS（業務SaaS向けデザイン） |
| バックエンド | Next.js Route Handlers |
| DB | PostgreSQL（Prisma ORM） |
| 認証 | Cookieベースの簡易実装（将来的に NextAuth 等へ差替え可） |
| バリデーション | Zod |
| AI | モック実装（`src/lib/ai.ts`）。LLM APIへの差し替えを想定したI/F |

---

## 2. プロジェクト概要

- **対応コース**: 事業展開等リスキリング支援コース（初期リリース）
- **将来拡張**: 人材育成支援コース / 人への投資促進コース
- **主要機能**:
  - 顧客入力フォーム（Step1〜10）
  - 必要書類ガイダンス／アップロード管理
  - AIによる要件判定・リスク検知・不足書類判定
  - 事業内職業能力開発計画ドラフト自動生成
  - 各種説明文ドラフト自動生成（事業展開、DX/GX、将来職務）
  - 社労士向け引継ぎパッケージ（JSON）出力
  - 差戻しコメント／進捗管理／監査ログ

---

## 3. セットアップ手順

### 3-1. 前提

- Node.js 20+
- PostgreSQL 14+（手元で起動済み）

PostgreSQLが用意できない場合は **SQLite で代用可能** です。`prisma/schema.prisma` の `datasource db` ブロックで `provider = "sqlite"` に変更し、`.env` の `DATABASE_URL` を `"file:./dev.db"` にしてください。

### 3-2. インストール

```bash
cd app
cp .env.example .env
# .env の DATABASE_URL を環境にあわせて書き換える
npm install
```

### 3-3. DBマイグレーション & seed 投入

```bash
npm run db:migrate     # 初回マイグレーション作成
npm run db:seed        # ダミーデータ投入
```

（既存DBをクリーンに作り直したい場合）
```bash
npm run db:reset
```

### 3-4. 起動

```bash
npm run dev
# http://localhost:3000
```

---

## 4. デモアカウント

パスワードは全て `password` です。

| ロール | メール | 権限 |
| --- | --- | --- |
| 管理者 | admin@example.com | 全案件閲覧・編集、ユーザー管理 |
| 顧客企業 | client@example.com | 自社案件の入力・アップロード・引継ぎ依頼 |
| 社労士 | sharoushi@example.com | 引継ぎ済み案件のレビュー |
| 研修事業者 | provider@example.com | 紐づく案件の閲覧・差戻し |

---

## 5. ディレクトリ構成

```
app/
├── prisma/
│   ├── schema.prisma          # 15テーブル + Enum定義
│   └── seed.ts                # ダミーデータ投入スクリプト
├── src/
│   ├── app/
│   │   ├── login/             # ログイン画面
│   │   ├── (app)/             # ログイン後共通レイアウト（サイドバー付き）
│   │   │   ├── projects/      # 案件一覧 / 詳細
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # ダッシュボード
│   │   │   │       ├── step1 〜 step10 # 各ステップ画面
│   │   │   └── admin/users/   # ユーザー管理（ADMINのみ）
│   │   └── api/               # REST API（Route Handlers）
│   ├── components/            # 共通コンポーネント（AppShell, Stepper, StepFooter）
│   └── lib/
│       ├── ai.ts              # AIモックロジック
│       ├── auth.ts            # 認証
│       ├── documents.ts       # 書類マスタ
│       ├── prisma.ts          # Prismaクライアント
│       ├── steps.ts           # ステップ定義
│       └── validation.ts      # Zodスキーマ
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 6. API一覧

| メソッド | パス | 用途 |
| --- | --- | --- |
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 現在ユーザー取得 |
| GET/POST | `/api/projects` | 案件一覧 / 新規作成 |
| GET/PATCH | `/api/projects/:id` | 案件詳細 / 更新 |
| GET/PATCH | `/api/projects/:id/steps[/:stepCode]` | ステップ管理 |
| GET/PATCH | `/api/projects/:id/company` | 企業情報 |
| GET/POST/PATCH/DELETE | `/api/projects/:id/offices[/:officeId]` | 事業所 |
| GET/POST/PATCH/DELETE | `/api/projects/:id/trainees[/:traineeId]` | 受講者 |
| GET/POST/PATCH/DELETE | `/api/projects/:id/trainings[/:trainingId]` | 訓練 |
| GET/PUT/POST(generate) | `/api/projects/:id/internal-plan[/generate]` | 事業内職業能力開発計画 |
| GET/PATCH | `/api/projects/:id/required-documents[/:docId]` | 必要書類 |
| GET/POST/DELETE | `/api/projects/:id/files[/:fileId]` | ファイル |
| POST | `/api/projects/:id/ai-check` | AIチェック実行 |
| GET | `/api/projects/:id/ai-check-results` | AIチェック結果 |
| POST | `/api/projects/:id/generate-drafts` | ドラフト一括生成 |
| GET | `/api/projects/:id/generated-contents` | 生成物取得 |
| POST/GET | `/api/projects/:id/handoff[-records]` | 社労士引継ぎ |
| PATCH | `/api/projects/:id/handoff-records/:handoffId` | 引継ぎ状態更新 |
| GET/POST | `/api/projects/:id/comments` | コメント |
| GET | `/api/admin/users` | ユーザー管理（ADMIN） |

---

## 7. AIロジックの差し替え方法

`src/lib/ai.ts` に実装されている以下の関数を、LLM API 呼び出しに置き換えることで本番運用に乗せられます。インターフェース（入力・出力型）は変えずに内部実装のみ書き換える構成になっています。

- `judgeCourseMatch(training)` - コース該当性判定
- `judgeMissingDocuments(trainees, trainings, required)` - 不足書類判定
- `detectRisks(trainings, trainees)` - リスクワード・要件違反検知
- `checkDeadline(project)` - 計画届期限チェック
- `generateInternalPlanDraft(company, plan)` - 計画書ドラフト
- `generateBusinessExpansionDescription(...)` - 事業展開説明文
- `generateDxGxDescription(...)` - DX/GX説明文
- `generateFutureRoleDescription(...)` - 将来職務説明文
- `generateReminderMessage(...)` - 催促文
- `generateHandoffMemo(...)` - 引継ぎメモ

例: OpenAI / Anthropic / Gemini 等のAPIキーを `.env` に追加し、各関数の中で fetch するだけで差し替え可能です。

```ts
// 例: generateInternalPlanDraft を Claude API に置き換える
export async function generateInternalPlanDraft(company, plan) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(company, plan) }],
    }),
  });
  const data = await res.json();
  return data.content[0].text;
}
```

---

## 8. 今後の拡張ポイント

- **認証強化**: NextAuth / Auth.js への置き換え、SSO、2FA
- **ストレージ**: ローカルFS → S3 / GCS / Azure Blob 対応
- **OCR**: アップロード書類のテキスト抽出・整合性チェック
- **他コース対応**: 人材育成支援コース / 人への投資促進コースのテンプレ追加（`subsidy_course` enum拡張で対応可能）
- **API連携**: 会計ソフト、雇用契約書管理システム
- **監査/コンプライアンス**: 操作ログのエクスポート、個人情報マスキング表示
- **通知**: メール / Slack / ChatWork 通知連携
- **Word/PDF書き出し**: 現在はテキストのみ。`docx` / `@react-pdf/renderer` 等の追加で書類出力可能

---

## 9. 注意事項

- 本システムは正式な申請を代行するものではありません。UI文言もその前提に統一しています。
- ドラフト文章は必ず人間（担当者・社労士）のレビュー後に提出してください。
- 個人情報の取り扱いは、運用時にセキュリティ要件を満たすストレージ・認証基盤と組み合わせてください。
