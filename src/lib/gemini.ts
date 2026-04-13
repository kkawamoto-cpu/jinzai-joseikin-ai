// Gemini API 連携
// ドキュメント: https://ai.google.dev/gemini-api/docs
// 環境変数 GEMINI_API_KEY 必須。未設定時はモックレスポンスを返します。

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

async function callGemini(parts: Part[], asJson: boolean): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      notes:
        "GEMINI_API_KEYが未設定のためモックを返しています。Vercelの環境変数にキーを設定してください。",
    });
  }
  const body: any = {
    contents: [{ parts }],
    generationConfig: asJson
      ? { responseMimeType: "application/json", temperature: 0.3 }
      : { temperature: 0.7 },
  };
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
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
  const text = await callGemini(parts, true);
  return safeParseJson(text);
}

/** テキスト（Excel抽出済みテキスト、音声書き起こし、自由入力）から抽出 */
export async function extractFromText(text: string): Promise<ExtractedFormData> {
  const parts: Part[] = [
    { text: EXTRACTION_SCHEMA_PROMPT },
    { text: `\n\n【入力テキスト】\n${text}` },
  ];
  const out = await callGemini(parts, true);
  return safeParseJson(out);
}

/** チャット対話モード：AIが不足情報を質問しながら引き出し、構造化データも同時に返す */
export async function chatExtract(
  messages: { role: "user" | "assistant"; text: string }[],
  currentData: ExtractedFormData
): Promise<{ reply: string; merged: ExtractedFormData; done: boolean }> {
  const system = `
あなたは人材開発支援助成金申請の入力代行AIです。ユーザーとの対話を通じて、申請に必要な情報を丁寧に聞き出してください。

【ルール】
1. 一度に2〜3個の質問までに絞る（ユーザーの負担を減らす）
2. 専門用語は避け、分かりやすい言葉で質問する
3. ユーザーの回答から情報が抽出できたら、structuredDataに反映
4. 全項目の最低限の情報が集まったら done=true にする
5. 日本語で返答

【既に集まっている情報】
${JSON.stringify(currentData, null, 2)}

【出力JSON構造】
{
  "reply": "ユーザーへの次のメッセージ。質問や確認など。",
  "structuredData": { 上記のExtractedFormData構造 },
  "done": false
}
`;
  const convo = messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.text}`)
    .join("\n");
  const parts: Part[] = [{ text: system }, { text: `\n\n【会話ログ】\n${convo}` }];
  const out = await callGemini(parts, true);
  const parsed = safeParseJson(out) as any;
  const merged = mergeExtracted(currentData, parsed.structuredData ?? {});
  return {
    reply:
      parsed.reply ||
      "ご回答ありがとうございます。続けて、会社の経営方針や今後の事業展開について教えてください。",
    merged,
    done: !!parsed.done,
  };
}

function safeParseJson(text: string): ExtractedFormData {
  try {
    // ```json ブロックを除去
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { notes: `JSON解析失敗: ${text.slice(0, 200)}` };
  }
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
