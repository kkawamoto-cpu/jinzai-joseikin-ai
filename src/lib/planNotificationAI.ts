// 職業訓練実施計画届（様式第1号）のドラフト生成
// 人材開発支援助成金（事業展開等リスキリング支援コース）用

const MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const FALLBACK_MODELS = [MODEL, "gemini-2.5-flash-lite", "gemini-2.5-pro"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const endpointFor = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

async function callLLM(prompt: string): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!apiKey) return "⚠ GEMINI_API_KEY未設定";
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 },
  };
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${endpointFor(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("\n").trim() || "";
      }
      if (res.status === 404) break;
      if (![429, 500, 503].includes(res.status)) break;
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error("Gemini APIが混雑しています。再試行してください。");
}

export type PlanNotificationData = {
  // 事業主情報
  companyName: string;
  representativeName: string;
  representativeTitle: string;
  corporateNumber: string;
  headOfficeAddress: string;
  headOfficePhone: string;
  employmentInsuranceOfficeNumber: string;
  employeeCount: number;
  capitalAmount: string;
  industryCode: string;
  // 職業能力開発推進者
  trainingPromotionName: string;
  trainingPromotionDepartment: string;
  trainingPromotionTitle: string;
  laborRepresentativeName: string;
  // 訓練情報（複数可）
  trainings: Array<{
    trainingName: string;
    providerName: string;
    trainingFormat: string;
    trainingType: string;
    instructionType: string;
    trainingStartDate: string;
    trainingEndDate: string;
    totalTrainingHours: number;
    tuitionFee: number;
    materialFee: number;
    location: string;
    instructorName: string;
    curriculumText: string;
    completionCondition: string;
    relationToBusinessExpansion: string;
    relationToDxGx: string;
    relationToFutureRole: string;
  }>;
  // 受講者
  trainees: Array<{
    fullName: string;
    employmentInsuranceNumber: string;
    employmentType: string;
    currentJobRole: string;
    futureJobRole: string;
    isExecutiveDualRole: boolean;
  }>;
  // 事業所
  offices: Array<{
    officeName: string;
    officeNumber: string;
    employeeCount: number;
    address: string;
    officeType: string;
  }>;
  // 事業内職業能力開発計画
  internalPlanSummary: string;
  // 計画届提出日
  submissionDate: string;
  // コース
  subsidyCourse: string;
};

/** 計画届のMarkdownドラフトを生成 */
export async function generatePlanNotification(data: PlanNotificationData): Promise<string> {
  const trainingsText = data.trainings
    .map(
      (t, i) =>
        `### 訓練${i + 1}: ${t.trainingName}
- 提供事業者: ${t.providerName || "（未定）"}
- 訓練形式: ${t.trainingFormat}
- OFF-JT/OJT: ${t.trainingType}
- 業務命令/自発: ${t.instructionType}
- 期間: ${t.trainingStartDate} ～ ${t.trainingEndDate}
- 総訓練時間: ${t.totalTrainingHours}時間
- 受講料: ¥${t.tuitionFee?.toLocaleString() || 0}
- 教材費: ¥${t.materialFee?.toLocaleString() || 0}
- 実施場所: ${t.location || "（未定）"}
- 講師: ${t.instructorName || "（未定）"}
- カリキュラム概要: ${t.curriculumText || "（未記載）"}
- 修了条件: ${t.completionCondition || "（未記載）"}
- 事業展開との関連: ${t.relationToBusinessExpansion || "（未記載）"}
- DX/GXとの関連: ${t.relationToDxGx || "（未記載）"}
- 将来職務との関連: ${t.relationToFutureRole || "（未記載）"}`
    )
    .join("\n\n");

  const traineesText = data.trainees
    .map(
      (t, i) =>
        `${i + 1}. ${t.fullName}（被保険者番号: ${t.employmentInsuranceNumber || "—"}）/ ${t.employmentType || "正社員"} / 現職: ${t.currentJobRole || "—"} → 訓練後: ${t.futureJobRole || "—"}${t.isExecutiveDualRole ? "【兼務役員】" : ""}`
    )
    .join("\n");

  const officesText = data.offices
    .map(
      (o, i) =>
        `${i + 1}. ${o.officeName}（${o.officeType === "MAIN" ? "本社" : "支社"}）/ 番号: ${o.officeNumber || "—"} / 従業員: ${o.employeeCount}名 / ${o.address || "—"}`
    )
    .join("\n");

  const prompt = `
あなたは日本の人材開発支援助成金（事業展開等リスキリング支援コース）の申請書作成の専門家です。
以下のデータから、「職業訓練実施計画届」のドラフトを作成してください。

# 出力要件
- 労働局に提出する正式書類をイメージした丁寧な文書
- Markdown形式で、見出し・表・箇条書きを活用
- 必要に応じてフィールドを補完（推測・仮説は【要確認】と明記）
- 以下の構成で必ず記載：

## 構成
1. **表紙** - 提出日、提出先（所轄労働局長 殿）、事業主名・代表者名・印
2. **事業主情報** - 法人番号、住所、電話番号、雇用保険適用事業所番号、従業員数、資本金、産業分類
3. **職業能力開発推進者** - 氏名、部署、役職
4. **労働者代表** - 氏名
5. **訓練実施計画の概要** - コース名（事業展開等リスキリング支援コース）
6. **訓練の詳細**（訓練ごとに）
   - 訓練名称、提供事業者、形式、期間、時間数、費用、実施場所、講師
   - カリキュラム概要
   - 修了要件
   - 事業展開等との関連性の説明（★審査で重視されるため具体的に）
   - DX/GX化との関連性
   - 将来従事予定職務との関連性
7. **受講予定者一覧**（表形式）
8. **事業所一覧**（表形式）
9. **事業内職業能力開発計画の概要**
10. **経費の見込み**（受講料・教材費の合計）
11. **提出書類チェックリスト**

# 入力データ

## 事業主情報
- 企業名: ${data.companyName}
- 代表者: ${data.representativeTitle} ${data.representativeName}
- 法人番号: ${data.corporateNumber || "【要確認】"}
- 住所: ${data.headOfficeAddress}
- 電話番号: ${data.headOfficePhone}
- 雇用保険適用事業所番号: ${data.employmentInsuranceOfficeNumber || "【要確認】"}
- 常時雇用する労働者数: ${data.employeeCount}名
- 資本金: ${data.capitalAmount}
- 産業分類: ${data.industryCode}

## 職業能力開発推進者
- 氏名: ${data.trainingPromotionName || "【要確認】"}
- 部署: ${data.trainingPromotionDepartment || "【要確認】"}
- 役職: ${data.trainingPromotionTitle || "【要確認】"}

## 労働者代表
- 氏名: ${data.laborRepresentativeName || "【要確認】"}

## 訓練情報
${trainingsText || "（訓練未登録）"}

## 受講者
${traineesText || "（受講者未登録）"}

## 事業所
${officesText || "（事業所未登録）"}

## 事業内職業能力開発計画（概要）
${data.internalPlanSummary || "（未作成）"}

## 提出予定日
${data.submissionDate || "【要確認】"}

## 対象コース
${data.subsidyCourse === "JIGYO_TENKAI_RESKILLING" ? "事業展開等リスキリング支援コース" : data.subsidyCourse}
`;

  return callLLM(prompt);
}
