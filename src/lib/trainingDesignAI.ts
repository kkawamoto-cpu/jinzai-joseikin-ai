// 研修開発支援のAIロジック
// ユーザーとの対話から研修カリキュラム・スケジュール・提案書を生成する

const MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const FALLBACK_MODELS = [
  MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-flash-latest",
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const endpointFor = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

async function callLLM(prompt: string, useTools = true): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    return `## AIキー未設定\n\nGEMINI_API_KEYが未設定のため生成できません。Vercelで設定してください。`;
  }
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5 },
  };
  if (useTools) {
    body.tools = [{ url_context: {} }, { google_search: {} }];
  }
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${endpointFor(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const partsOut: any[] = data?.candidates?.[0]?.content?.parts ?? [];
        return partsOut.map((p: any) => p?.text ?? "").join("\n").trim();
      }
      if (res.status === 404) break;
      if (res.status === 400 && useTools) {
        delete body.tools;
        continue;
      }
      if (![429, 500, 503].includes(res.status)) {
        const err = await res.text();
        throw new Error(`Gemini API ${res.status}: ${err.slice(0, 200)}`);
      }
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error("Gemini APIが混雑しています。しばらく待ってから再度お試しください。");
}

/** 対話応答：ユーザーメッセージに対して AI が次の質問・提案を返す */
export async function chatForDesign(
  messages: { role: "user" | "assistant"; text: string }[],
  context: {
    title: string;
    clientNeeds?: string;
    meetingNotes?: string;
    targetAudience?: string;
    targetGoal?: string;
  }
): Promise<string> {
  const convo = messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`)
    .join("\n");
  const prompt = `
あなたは企業研修・人材育成の専門コンサルタントです。人材開発支援助成金（事業展開等リスキリング支援コース）の対象となる研修を、クライアントとの対話を通じて設計してください。

# ルール
1. 助成金対象要件に適合するよう配慮：OFF-JT、10時間以上、事業展開・DX/GX・将来職務に関連する内容
2. クライアントの業種・現状・目標を丁寧にヒアリング
3. 一度に2〜3個の質問まで
4. 必要に応じて google_search ツールで業界動向・類似研修事例を検索して提案の質を高める
5. URLが示されたら url_context ツールで内容を読み込む
6. 自然な対話調・丁寧語で回答
7. 十分な情報が集まったら「カリキュラムを生成できます」と案内

# 設計情報
- タイトル: ${context.title}
- クライアント要望: ${context.clientNeeds || "（未入力）"}
- 会議議事録: ${context.meetingNotes || "（未入力）"}
- 対象受講者: ${context.targetAudience || "（未入力）"}
- 目標状態: ${context.targetGoal || "（未入力）"}

# 会話履歴
${convo}

次のAIの返答だけ、自然文で返してください（マークダウン可）。
`;
  return callLLM(prompt, true);
}

/** カリキュラム生成 */
export async function generateCurriculum(context: {
  title: string;
  clientNeeds?: string;
  meetingNotes?: string;
  targetAudience?: string;
  targetGoal?: string;
  messages?: { role: string; text: string }[];
}): Promise<string> {
  const convoText = (context.messages || [])
    .map((m) => `${m.role}: ${m.text}`)
    .join("\n");
  const prompt = `
あなたは企業研修カリキュラム設計のプロです。以下の情報から、人材開発支援助成金（事業展開等リスキリング支援コース）の対象要件に合うカリキュラムを設計してください。

# 情報
- タイトル: ${context.title}
- クライアント要望: ${context.clientNeeds || "（未入力）"}
- 会議議事録: ${context.meetingNotes || "（未入力）"}
- 対象受講者: ${context.targetAudience || "（未入力）"}
- 目標状態: ${context.targetGoal || "（未入力）"}

# これまでの対話
${convoText}

# 出力（Markdown形式）
以下の構造で必ず書いてください：

## 1. 研修概要
（2〜3行）

## 2. 受講対象
対象者の属性・人数・前提知識

## 3. 学習目標（到達目標）
- 箇条書き3〜5個、具体的・測定可能

## 4. カリキュラム全体構成
- 総訓練時間: ○○時間（10時間以上であること）
- 実施形式: OFF-JT（通学/オンライン同時双方向など）
- 実施期間: ○○週間（または○○か月）

## 5. セッション構成
| セッション | 内容 | 時間 | 講師形態 |
| --- | --- | --- | --- |
| 第1回 | … | 2h | 集合型講義+演習 |
...

## 6. 使用教材・ツール

## 7. 修了要件・評価方法

## 8. 事業展開・DX/GX・将来職務との関連
（助成金審査ポイント。40文字以上で具体的に）

## 9. 期待される成果（KPI）
`;
  return callLLM(prompt, true);
}

/** スケジュール生成（JSON） */
export async function generateSchedule(
  curriculum: string,
  startDate?: string
): Promise<string> {
  const prompt = `
以下のカリキュラムに基づき、セッションごとの具体的な日時スケジュールを JSON 配列で生成してください。

# カリキュラム
${curriculum}

# 条件
- 開始日（目安）: ${startDate || "未指定（開始を仮に2026-06-01とする）"}
- 平日夜または土曜の実施を想定
- 週1〜2回のペースを基本
- JSON のみ返す（コードブロック付きでも可）

# 出力形式
\`\`\`json
[
  {"session": 1, "title": "第1回 XX", "date": "2026-06-05", "start": "19:00", "end": "21:00", "format": "オンライン同時双方向", "notes": ""},
  ...
]
\`\`\`
`;
  return callLLM(prompt, false);
}

/** 提案書生成（クライアント向けMarkdown） */
export async function generateProposal(context: {
  title: string;
  clientCompanyName?: string;
  curriculum: string;
  schedule?: string;
  feePerPerson?: number;
  participants?: number;
}): Promise<string> {
  const prompt = `
以下の情報から、顧客企業に提示する研修提案書を Markdown で作成してください。日本のビジネス文書として丁寧で格調高く、読みやすい構成にしてください。

# 情報
- 研修タイトル: ${context.title}
- 顧客企業名: ${context.clientCompanyName || "（貴社）"}
- カリキュラム: ${context.curriculum}
- スケジュール: ${context.schedule || "（別途調整）"}
- 想定受講人数: ${context.participants || "未定"}
- 想定受講料: ${context.feePerPerson ? `1名あたり ¥${context.feePerPerson.toLocaleString()}` : "別途御見積"}

# 構成
1. 表紙相当の見出し（${context.title} ご提案）
2. はじめに（背景と目的・3〜4文）
3. 本研修の特徴（箇条書き3〜5）
4. カリキュラム概要
5. スケジュール案
6. 投資と期待効果（費用 / ROI / KPI）
7. 人材開発支援助成金のご案内（事業展開等リスキリング支援コース該当性・想定助成額概算）
8. 導入までの流れ
9. お問合せ先

**重要**: 文章は「ですます調」で統一。専門用語は平易に説明。数字は半角。
`;
  return callLLM(prompt, false);
}
