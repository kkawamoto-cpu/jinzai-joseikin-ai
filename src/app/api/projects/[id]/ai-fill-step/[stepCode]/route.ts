import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { extractFromText } from "@/lib/gemini";
import { logActivity } from "@/lib/api";

// ========== DBに保存可能なフィールドのホワイトリスト ==========
const COMPANY_FIELDS = [
  "companyName",
  "representativeName",
  "representativeTitle",
  "headOfficeAddress",
  "headOfficePhone",
  "capitalAmount",
  "corporateNumber",
  "employeeCount",
  "employmentInsuranceOfficeNumber",
  "industryCode",
  "branchCount",
  "laborRepresentativeName",
  "trainingPromotionDepartment",
  "trainingPromotionTitle",
  "trainingPromotionName",
];
const OFFICE_FIELDS = [
  "officeType",
  "officeName",
  "officeNumber",
  "employeeCount",
  "address",
];
const TRAINEE_FIELDS = [
  "fullName",
  "gender",
  "employmentInsuranceNumber",
  "employmentType",
  "currentJobRole",
  "futureJobRole",
  "targetTrainingName",
  "isExecutiveDualRole",
  "isOnChildcareLeave",
  "isRemoteTraining",
];
const TRAINING_FIELDS = [
  "trainingName",
  "providerName",
  "trainingFormat",
  "trainingStartDate",
  "trainingEndDate",
  "totalTrainingHours",
  "standardLearningHours",
  "standardLearningPeriod",
  "tuitionFee",
  "admissionFee",
  "materialFee",
  "location",
  "instructorName",
  "curriculumText",
  "completionCondition",
  "instructionType",
  "trainingType",
  "relationToBusinessExpansion",
  "relationToDxGx",
  "relationToFutureRole",
];
const PLAN_FIELDS = [
  "managementPhilosophy",
  "managementPolicy",
  "futureBusinessPolicy",
  "focusArea",
  "idealHumanResource",
  "hrBasicPolicy",
  "roleBasedDevelopmentPolicy",
  "trainingPurpose",
  "careerSupportPolicy",
  "selfDevelopmentSupportPolicy",
  "placementPolicy",
  "promotionCriteria",
  "evaluationCriteria",
  "qualificationReflection",
  "executiveSkillRequirements",
  "midlevelSkillRequirements",
  "juniorSkillRequirements",
];
const pickAllowed = (obj: any, fields: string[]) => {
  const out: any = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of fields) {
    if (k in obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
      out[k] = obj[k];
  }
  return out;
};

const TRAINING_FORMATS = ["ONSITE", "LIVE_ONLINE", "E_LEARNING", "CORRESPONDENCE", "SUBSCRIPTION"];
const INSTRUCTION_TYPES = ["BUSINESS_ORDER", "VOLUNTARY"];
const TRAINING_TYPES = ["OFF_JT", "OFF_JT_OJT"];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; stepCode: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const hint: string = body.hint || "";
  const apply: boolean = body.apply ?? true;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      offices: true,
      trainees: true,
      trainings: true,
      internalPlan: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const ctx = JSON.parse(
    JSON.stringify(project, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

  const stepInstructions: Record<string, string> = {
    STEP_2_COMPANY_INFO: `【対象Step】 Step2 企業基本情報
【埋めるキー】 "company" のみ。 ${COMPANY_FIELDS.join(", ")}
【方針】会社名から Google検索で法人番号・本社住所・資本金・雇用保険番号を補完。不明なら業界・規模から合理的な仮定。資本金は円単位の数値のみ。`,
    STEP_3_OFFICES: `【対象Step】 Step3 事業所情報
【埋めるキー】 "offices" 配列のみ。各要素のキー: ${OFFICE_FIELDS.join(", ")}
【方針】本社+支社を構成。officeTypeは"MAIN"または"BRANCH"。労働者数合計が会社の従業員数に一致するよう按分。`,
    STEP_4_TRAINEES: `【対象Step】 Step4 受講者情報
【埋めるキー】 "trainees" 配列のみ。各要素のキー: ${TRAINEE_FIELDS.join(", ")}
【方針】訓練内容とヒントから受講者を生成。氏名は「受講者A」等の仮置きでOK。currentJobRoleとfutureJobRole両方必須。employmentTypeは「正社員」を初期値に。`,
    STEP_5_TRAINING_INFO: `【対象Step】 Step5 訓練情報
【埋めるキー】 "trainings" 配列のみ。各要素のキー: ${TRAINING_FIELDS.join(", ")}
【方針】OFF-JT 10時間以上、DX/GX関連のリスキリング訓練。関連性記述は40文字以上具体的に。trainingFormat:${TRAINING_FORMATS.join("/")}, instructionType:${INSTRUCTION_TYPES.join("/")}, trainingType:${TRAINING_TYPES.join("/")}。日付はYYYY-MM-DD。`,
    STEP_6_INTERNAL_PLAN: `【対象Step】 Step6 事業内職業能力開発計画
【埋めるキー】 "internalPlan" オブジェクトのみ。キー一覧: ${PLAN_FIELDS.join(", ")}
【方針】会社情報・訓練情報から全項目を150〜300文字で生成。経営理念・人材育成方針・評価制度・職位別求められる能力など。日本の中小企業として一般的で妥当な内容に。`,
  };

  const instruction = stepInstructions[params.stepCode];
  if (!instruction) {
    return NextResponse.json(
      { error: `Step ${params.stepCode} はAI入力代行に対応していません` },
      { status: 400 }
    );
  }

  const prompt = `
あなたは人材開発支援助成金（事業展開等リスキリング支援コース）の入力代行AIです。指定されたStepに対応するキーのみを含むJSONを生成してください。

# 重要な方針
- 情報が不足していても、既存情報から合理的な仮説を立てて暫定値を入れる。空欄を残さない。
- 会社名などから google_search / url_context を積極的に使い、公開情報で補完する。
- **指定されたキー以外は絶対に含めないこと**。

# プロジェクトコンテキスト（既存データ）
${JSON.stringify(ctx, null, 2)}

# 追加ヒント
${hint || "（特になし）"}

# 対象Step指示
${instruction}

# 出力形式
\`\`\`json
{ 指定されたルートキー: 値 }
\`\`\`
`;

  let data: any = {};
  try {
    data = await extractFromText(prompt);
  } catch (e: any) {
    console.error("AI fill step Gemini error:", e);
    return NextResponse.json(
      { error: "AI生成に失敗しました: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }

  let applied: any = {};
  if (apply) {
    try {
      // ============ 会社情報 ============
      if (data.company) {
        const c = pickAllowed(data.company, COMPANY_FIELDS);
        if (c.capitalAmount) {
          const n = Number(String(c.capitalAmount).replace(/[^\d.-]/g, ""));
          if (Number.isFinite(n)) {
            try {
              c.capitalAmount = BigInt(Math.round(n));
            } catch {
              delete c.capitalAmount;
            }
          } else {
            delete c.capitalAmount;
          }
        }
        for (const k of ["employeeCount", "branchCount"]) {
          if (k in c) {
            const n = Number(c[k]);
            c[k] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
            if (c[k] === undefined) delete c[k];
          }
        }
        if (Object.keys(c).length > 0) {
          await prisma.company.update({ where: { id: project.companyId }, data: c });
          applied.company = Object.keys(c).length;
        }
      }

      // ============ 事業所 ============
      if (Array.isArray(data.offices) && data.offices.length > 0) {
        const base = await prisma.office.count({ where: { projectId: params.id } });
        const valid = data.offices
          .map((o: any, i: number) => {
            const picked = pickAllowed(o, OFFICE_FIELDS);
            if (!picked.officeName) picked.officeName = `事業所${base + i + 1}`;
            picked.officeType =
              picked.officeType === "MAIN" || picked.officeType === "BRANCH"
                ? picked.officeType
                : base + i === 0
                ? "MAIN"
                : "BRANCH";
            const n = Number(picked.employeeCount);
            picked.employeeCount = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
            return { ...picked, projectId: params.id, sortOrder: base + i };
          })
          .filter((o: any) => o.officeName);
        if (valid.length) {
          await prisma.office.createMany({ data: valid });
          applied.offices = valid.length;
        }
      }

      // ============ 受講者 ============
      if (Array.isArray(data.trainees) && data.trainees.length > 0) {
        const valid = data.trainees
          .map((t: any) => {
            const picked: any = pickAllowed(t, TRAINEE_FIELDS);
            if (!picked.fullName) picked.fullName = "（氏名未記載）";
            picked.isExecutiveDualRole = !!picked.isExecutiveDualRole;
            picked.isOnChildcareLeave = !!picked.isOnChildcareLeave;
            picked.isRemoteTraining = !!picked.isRemoteTraining;
            return { ...picked, projectId: params.id };
          });
        if (valid.length) {
          await prisma.trainee.createMany({ data: valid });
          applied.trainees = valid.length;
        }
      }

      // ============ 訓練 ============
      if (Array.isArray(data.trainings) && data.trainings.length > 0) {
        for (const t of data.trainings) {
          const picked: any = pickAllowed(t, TRAINING_FIELDS);
          if (!picked.trainingName) picked.trainingName = "（研修名未記載）";
          if (!TRAINING_FORMATS.includes(picked.trainingFormat))
            picked.trainingFormat = "LIVE_ONLINE";
          if (!INSTRUCTION_TYPES.includes(picked.instructionType))
            picked.instructionType = "BUSINESS_ORDER";
          if (!TRAINING_TYPES.includes(picked.trainingType)) picked.trainingType = "OFF_JT";
          for (const dk of ["trainingStartDate", "trainingEndDate"]) {
            if (picked[dk]) {
              const d = new Date(picked[dk]);
              picked[dk] = isNaN(d.getTime()) ? null : d;
            }
          }
          for (const nk of [
            "totalTrainingHours",
            "standardLearningHours",
            "standardLearningPeriod",
            "tuitionFee",
            "admissionFee",
            "materialFee",
          ]) {
            if (nk in picked) {
              const n = Number(picked[nk]);
              if (nk === "totalTrainingHours" || nk === "tuitionFee") {
                picked[nk] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
              } else {
                picked[nk] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
              }
            }
          }
          await prisma.training.create({ data: { ...picked, projectId: params.id } });
        }
        applied.trainings = data.trainings.length;
      }

      // ============ 事業内職業能力開発計画 ============
      if (data.internalPlan && typeof data.internalPlan === "object") {
        const p = pickAllowed(data.internalPlan, PLAN_FIELDS);
        if (Object.keys(p).length > 0) {
          await prisma.internalCapabilityPlan.upsert({
            where: { projectId: params.id },
            create: { ...p, projectId: params.id },
            update: p,
          });
          applied.internalPlan = Object.keys(p).length;
        }
      }
    } catch (e: any) {
      console.error("AI fill step DB write error:", e);
      return NextResponse.json(
        {
          error: "AI生成内容のDB保存に失敗しました: " + (e?.message || "unknown"),
          aiData: data,
        },
        { status: 500 }
      );
    }
  }

  await logActivity(
    params.id,
    user.id,
    "AI_FILL_STEP",
    `AI入力代行: ${params.stepCode} / 反映: ${JSON.stringify(applied)}`
  );

  return NextResponse.json({ data, applied });
}
