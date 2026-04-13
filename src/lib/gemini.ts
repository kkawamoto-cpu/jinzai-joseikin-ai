// Gemini API 連携
// ドキュメント: https://ai.google.dev/gemini-api/docs
// 環境変数 GEMINI_API_KEY 必須。未設定時はモックレスポンスを返します。

// 注意: gemini-2.0-flash は無料枠が0のため使えません。gemini-2.5-flash を主に使用。
// 過負荷時に自動でフォールバックする候補リスト。
const PRIMARY_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const FALLBACK_MODELS = [
  PRIMARY_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-flash-latest",
];
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type ExtractedFormData = {
  company?: {
    companyName?: string;
    representativeName?: string;
    representativeTitle?: string;
    headOfficeAddress?: string;
    headOfficePhone?: string;
    capitalAmount?: number;
    corporateNumber?: string;
    employeeCount?: number;
    employmentInsuranceOfficeNumber?: string;
    industryCode?: string;
    branchCount?: number;
    laborRepresentativeName?: string;
    trainingPromotionDepartment?: string;
    trainingPromotionTitle?: string;
    trainingPromotionName?: string;
  };
  offices?: Array<{
    officeType?: "MAIN" | "BRANCH";
    officeName?: string;
    officeNumber?: string;
    employeeCount?: number;
    address?: string;
  }>;
  trainees?: Array<{
    fullName?: string;
    gender?: string;
    employmentInsuranceNumber?: string;
    employmentType?: string;
    currentJobRole?: string;
    futureJobRole?: string;
    targetTrainingName?: string;
    isExecutiveDualRole?: boolean;
    isOnChildcareLeave?: boolean;
    isRemoteTraining?: boolean;
  }>;
  trainings?: Array<{
    trainingName?: string;
    providerName?: string;
    trainingFormat?: "ONSITE" | "LIVE_ONLINE" | "E_LEARNING" | "CORRESPONDENCE" | "SUBSCRIPTION";
    trainingStartDate?: string;
    trainingEndDate?: string;
    totalTrainingHours?: number;
    standardLearningHours?: number;
    tuitionFee?: number;
    materialFee?: number;
    curriculumText?: string;
    completionCondition?: string;
    instructionType?: "BUSINESS_ORDER" | "VOLUNTARY";
    trainingType?: "OFF_JT" | "OFF_JT_OJT";
    relationToBusinessExpansion?: string;
    relationToDxGx?: string;
    relationToFutureRole?: string;
  }>;
  internalPlan?: {
    managementPhilosophy?: string;
    managementPolicy?: string;
    futureBusinessPolicy?: string;
    focusArea?: string;
    idealHumanResource?: string;
    hrBasicPolicy?: string;
    roleBasedDevelopmentPolicy?: string;
    trainingPurpose?: string;
    careerSupportPolicy?: string;
    selfDevelopmentSupportPolicy?: string;
    placementPolicy?: string;
    promotionCriteria?: string;
    evaluationCriteria?: string;
    qualificationReflection?: string;
    executiveSkillRequirements?: string;
    midlevelSkillRequirements?: string;
    juniorSkillRequirements?: string;
  };
  notes?: string;
};

export const EXTRACTION_SCHEMA_PROMPT = `
あなたは人材開発支援助成金（事業展開等リスキリング支援コース）の申請準備を支援するAIアシスタントです。
提供された情報から、以下のJSON構造に該当する情報のみを抽出してください。該当情報が見つからない項目は省略してください。推測せず、文書・音声・会話から明示的に読み取れる情報のみ記載してください。

出力JSON構造:
{
  "company": { 会社情報 },
  "offices": [ 事業所の配列 ],
  "trainees": [ 受講者の配列 ],
  "trainings": [ 訓練の配列 ],
  "internalPlan": { 事業内職業能力開発計画の項目 },
  "notes": "抽出時の補足メモ（不明確な箇所、確認すべき点）"
}

注意:
- 金額は円単位の数値で（例: 50000000）
- 日付はYYYY-MM-DD形式
- 法人番号は13桁の文字列、雇用保険適用事業所番号は11桁の文字列
- trainingFormat: ONSITE(通学) / LIVE_ONLINE(同時双方向) / E_LEARNING / CORRESPONDENCE(通信) / SUBSCRIPTION(定額制)
- instructionType: BUSINESS_ORDER(業務命令) / VOLUNTARY(自発)
- trainingType: OFF_JT / OFF_JT_OJT
`;

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GeminiOptions = {
  asJson?: boolean;
  useTools?: boolean; // url_context + google_search を有効化
};

async function callGemini(parts: Part[], opts: GeminiOptions = {}): Promise<string> {
  const { asJson = false, useTools = false } = opts;
  // 余計なクォート・空白を除去
  const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    return JSON.stringify({
      notes:
        "GEMINI_API_KEYが未設定のためモックを返しています。Vercelの環境変数にキーを設定してください。",
    });
  }

  // Gemini のツール（URL読み込み + Google検索）を使うと、
  // JSONモード（responseMimeType）は併用できない仕様なので、自然文→JSON抽出に切替
  const body: any = {
    contents: [{ parts }],
    generationConfig:
      asJson && !useTools
        ? { responseMimeType: "application/json", temperature: 0.3 }
        : { temperature: useTools ? 0.4 : 0.7 },
  };
  if (useTools) {
    // https://ai.google.dev/gemini-api/docs/url-context
    // https://ai.google.dev/gemini-api/docs/grounding
    body.tools = [{ url_context: {} }, { google_search: {} }];
  }

  // 503/429 リトライ + モデルフォールバック
  let lastErr: { status: number; text: string } | null = null;
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${endpointFor(model)}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          // 複数パートを連結（ツール使用時は複数返る場合がある）
          const partsOut: any[] = data?.candidates?.[0]?.content?.parts ?? [];
          const text = partsOut.map((p: any) => p?.text ?? "").join("\n").trim();
          return text;
        }
        const err = await res.text();
        lastErr = { status: res.status, text: err };
        if (res.status === 404) break;
        if (res.status === 400 && useTools && /tool|function/i.test(err)) {
          // ツール非対応モデルの場合、ツールなしで再試行（1回のみ）
          delete body.tools;
          body.generationConfig = asJson
            ? { responseMimeType: "application/json", temperature: 0.3 }
            : { temperature: 0.7 };
          continue;
        }
        if (![429, 500, 503].includes(res.status)) {
          throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`);
        }
        await sleep(1000 * Math.pow(2, attempt));
      } catch (e: any) {
        if (attempt === 2) lastErr = { status: 0, text: String(e.message || e) };
        await sleep(500);
      }
    }
  }
  throw new Error(
    `Gemini APIが現在混雑しています。しばらく待ってから再度お試しください。(${lastErr?.status ?? 0})`
  );
}

/** ファイル（PDF/画像等）からフォームデータを抽出 */
export async function extractFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  userContext?: string
): Promise<ExtractedFormData> {
  const base64 = fileBuffer.toString("base64");
  const parts: Part[] = [
    { text: EXTRACTION_SCHEMA_PROMPT },
    {
      text: userContext
        ? `\n\n【ユーザーからの補足情報】\n${userContext}\n\n上記とアップロードされたファイル内容を総合して抽出してください。`
        : "\n\n添付ファイルから情報を抽出してください。",
    },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ];
  // ファイル抽出時はURL/検索ツール不要（ファイル内容から抽出するため）
  const text = await callGemini(parts, { asJson: true });
  return safeParseJson(text);
}

/** テキスト（Excel抽出済みテキスト、音声書き起こし、自由入力）から抽出 */
export async function extractFromText(text: string): Promise<ExtractedFormData> {
  const parts: Part[] = [
    { text: EXTRACTION_SCHEMA_PROMPT },
    {
      text: `\n\n【入力テキスト】\n${text}\n\nテキスト中にURLがある場合は、url_contextツールでそのページを開いて情報を読み取ってください。会社名が分かる場合はgoogle_searchツールで法人番号や住所などの公開情報を検索して補完してください。`,
    },
  ];
  // URLや会社名が含まれる場合に備えてツール有効化
  const out = await callGemini(parts, { asJson: true, useTools: true });
  return safeParseJson(out);
}

/** チャット対話モード：AIが不足情報を質問しながら引き出し、構造化データも同時に返す */
export async function chatExtract(
  messages: { role: "user" | "assistant"; text: string }[],
  currentData: ExtractedFormData
): Promise<{ reply: string; merged: ExtractedFormData; done: boolean }> {
  const system = `
あなたは人材開発支援助成金申請の入力代行AIです。ユーザーとの対話と、Web検索・URL読み取りを駆使して、申請に必要な情報を能動的に集めてください。

【必ず守るルール】
1. ユーザーがURL（https://...）を貼り付けたら、**必ず url_context ツールでそのページを開いて** 会社名・所在地・代表者・事業内容を読み取り、structuredDataに反映する。URLが読めないという返答を繰り返してはいけない。
2. 会社名が判明したら、**google_search ツールで「会社名 法人番号」「会社名 本社所在地」を検索** して、法人番号(13桁)・本店住所・資本金・設立年月日・代表者名などの公開情報を自動取得する。
3. 同じ質問を繰り返さない。前の会話で既に回答が得られた項目は再度聞かない。
4. 一度に聞く質問は最大2個まで（ユーザーの負担軽減）。
5. 専門用語は避け、平易な日本語で質問する。
6. 情報取得後は「○○を検索して見つけました: △△ でよろしいですか？」のように確認する。
7. currentDataと結合できる最低限の情報（会社名・所在地・従業員数・訓練内容の概要）が集まったら done=true にする。
8. 出力は **JSONコードブロック** で以下の構造に従う：

\`\`\`json
{
  "reply": "ユーザーへの次のメッセージ",
  "structuredData": { 下記ExtractedFormData構造 },
  "done": false
}
\`\`\`

【ExtractedFormData構造】
${EXTRACTION_SCHEMA_PROMPT}

【既に集まっている情報】
${JSON.stringify(currentData, null, 2)}
`;
  const convo = messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`)
    .join("\n");
  const parts: Part[] = [{ text: system }, { text: `\n\n【会話ログ】\n${convo}` }];
  // ツール（URL読み取り + Google検索）を有効化
  const out = await callGemini(parts, { asJson: true, useTools: true });
  const parsed = safeParseJson(out) as any;
  const merged = mergeExtracted(currentData, parsed.structuredData ?? {});
  return {
    reply:
      parsed.reply ||
      out.replace(/```json[\s\S]*?```/g, "").trim() ||
      "続けて情報を教えてください。",
    merged,
    done: !!parsed.done,
  };
}

function safeParseJson(text: string): ExtractedFormData {
  if (!text) return { notes: "AIから空の応答でした" };
  // ```json ... ``` のコードブロックを優先
  const fence = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const candidates: string[] = [];
  if (fence) candidates.push(fence[1]);
  // 最初の { から最後の } までを抽出
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }
  candidates.push(text.trim());
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  // JSONとして解釈できない場合は reply としてそのまま返す
  return { notes: text.slice(0, 500) } as any;
}

export function mergeExtracted(a: ExtractedFormData, b: ExtractedFormData): ExtractedFormData {
  const out: ExtractedFormData = { ...a };
  if (b.company) out.company = { ...(a.company || {}), ...b.company };
  if (b.internalPlan) out.internalPlan = { ...(a.internalPlan || {}), ...b.internalPlan };
  if (b.offices?.length) out.offices = [...(a.offices || []), ...b.offices];
  if (b.trainees?.length) out.trainees = [...(a.trainees || []), ...b.trainees];
  if (b.trainings?.length) out.trainings = [...(a.trainings || []), ...b.trainings];
  if (b.notes) out.notes = [a.notes, b.notes].filter(Boolean).join(" / ");
  return out;
}
