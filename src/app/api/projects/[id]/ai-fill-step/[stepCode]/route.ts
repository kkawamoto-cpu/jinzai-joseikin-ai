import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { extractFromText } from "@/lib/gemini";
import { logActivity } from "@/lib/api";

/**
 * POST /api/projects/:id/ai-fill-step/:stepCode
 *
 * 各Step用のAI入力代行。既存のプロジェクト情報（会社情報・訓練情報など）を
 * コンテキストとして Gemini に与え、指定Stepの項目を仮説ベースで補完生成する。
 *
 * body: { hint?: string }  ユーザーからの追加ヒント（任意）
 * returns: { data: ExtractedFormData, applied?: any }  （applyFlag=true なら書き込みまで実施）
 */
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

  // BigInt を string に
  const ctx = JSON.parse(
    JSON.stringify(project, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

  // Stepごとの指示プロンプト
  const stepInstructions: Record<string, string> = {
    STEP_2_COMPANY_INFO: `
【対象Step】 Step2 企業基本情報
【埋める項目】 company の全項目（companyName, representativeName, representativeTitle, headOfficeAddress, headOfficePhone, capitalAmount, corporateNumber, employeeCount, employmentInsuranceOfficeNumber, industryCode, branchCount, laborRepresentativeName, trainingPromotionDepartment, trainingPromotionTitle, trainingPromotionName）

【仮説立案ルール】
- 会社名が既に入っていれば、google_search ツールで「会社名 法人番号」「会社名 本社所在地」「会社名 資本金」を検索し、公開情報から自動補完してください。
- 見つからない項目は、業界・規模から合理的な初期値を仮定（例: 職業能力開発推進者の部署→「人事部」、役職→「部長」、労働者代表→「（労働組合代表）」など）
- 法人番号は 13桁の数値文字列。不明なら 空欄で null を設定せず項目省略。
- 資本金は円単位の数値（例: 50000000）
- 雇用保険適用事業所番号は 11桁の文字列、不明なら省略
`,
    STEP_3_OFFICES: `
【対象Step】 Step3 事業所情報
【埋める項目】 offices 配列（officeType, officeName, officeNumber, employeeCount, address）

【仮説立案ルール】
- company.headOfficeAddress があれば本社として1件提案
- company.branchCount が N なら、「支社1」「支社2」... と N 件追加（住所は未定なら都道府県名のみ、または「（調査中）」）
- 労働者数の合計が company.employeeCount に一致するよう按分（本社に7割、支社均等に3割など）
`,
    STEP_4_TRAINEES: `
【対象Step】 Step4 受講者情報
【埋める項目】 trainees 配列（fullName, gender, employmentInsuranceNumber, employmentType, currentJobRole, futureJobRole, targetTrainingName）

【仮説立案ルール】
- 訓練情報(trainings)から、受講対象者の人数・職種を推測（例: 「DXリスキリング訓練」なら営業・事務の中堅社員3〜5名）
- ヒントに「社員3名」とあれば3名分を生成。氏名は「受講者A」「受講者B」のように仮置き、ユーザーが後で修正できるようにnotesに明記。
- currentJobRole と futureJobRole の両方を埋める（審査で重視）
- 雇用区分は「正社員」を初期値に
`,
    STEP_5_TRAINING_INFO: `
【対象Step】 Step5 訓練情報
【埋める項目】 trainings 配列（trainingName, providerName, trainingFormat, trainingStartDate, trainingEndDate, totalTrainingHours, standardLearningHours, tuitionFee, materialFee, curriculumText, completionCondition, instructionType, trainingType, relationToBusinessExpansion, relationToDxGx, relationToFutureRole）

【仮説立案ルール】
- 事業展開等リスキリング支援コース前提：OFF-JTで10時間以上、DX/GX関連の訓練を想定
- 関連性の記述は必ず40文字以上、具体的に（事業展開・DX/GX・将来職務との明確な関連）
- 提供事業者名が不明なら「（研修提供事業者 確認中）」
- 費用が不明なら、研修形式と時間数から相場を推定（例: オンライン40時間 = 20万円前後）
`,
    STEP_6_INTERNAL_PLAN: `
【対象Step】 Step6 事業内職業能力開発計画
【埋める項目】 internalPlan の全項目

【仮説立案ルール】
- 会社情報（業種、規模、事業内容）と訓練情報から、経営理念・人材育成方針・昇進昇格基準等を具体的に生成
- 各項目150〜300文字程度の充実した内容
- 「自律的な人材」「DX推進」「リスキリング」等の審査で評価されるキーワードを盛り込む
- 日本の中小企業として一般的・妥当な内容（過度に野心的でない）
`,
  };

  const instruction = stepInstructions[params.stepCode] || "";
  if (!instruction) {
    return NextResponse.json(
      { error: `Step ${params.stepCode} はAI入力代行に対応していません` },
      { status: 400 }
    );
  }

  const prompt = `
あなたは人材開発支援助成金（事業展開等リスキリング支援コース）の入力代行AIです。以下のプロジェクトコンテキストを参考に、指定Stepの項目を**必ず埋めて**返してください。

# 重要な方針
- 情報が不足していても、**既存情報から合理的な仮説を立てて暫定値を入れる**こと。空欄を残さない。
- 会社名などから google_search / url_context を積極的に使い、公開情報で補完する。
- 不確実な値には notes に「要確認」と明記する。
- 既に入力済みの情報（contextにあるもの）は上書きせず、未入力項目のみ補完する。

# プロジェクトコンテキスト
${JSON.stringify(ctx, null, 2)}

# ユーザーからの追加ヒント
${hint || "（特になし）"}

# 埋める対象Stepの詳細指示
${instruction}

# 出力形式
前回指示したExtractedFormData構造の JSON を \`\`\`json ... \`\`\` コードブロックで返してください。
該当Step以外の項目（たとえばStep2でrunningを埋めるなど）は含めないでください。
`;

  const data = await extractFromText(prompt);

  let applied: any = undefined;
  if (apply) {
    // ai-apply と同等の処理をインラインで
    const d: any = data;
    const act: Record<string, number> = {};
    if (d.company && Object.keys(d.company).length > 0) {
      const c: any = { ...d.company };
      if (c.capitalAmount) {
        try {
          c.capitalAmount = BigInt(Math.round(Number(c.capitalAmount)));
        } catch {
          delete c.capitalAmount;
        }
      }
      for (const k of Object.keys(c)) if (c[k] === "" || c[k] === null) delete c[k];
      if (Object.keys(c).length > 0) {
        await prisma.company.update({ where: { id: project.companyId }, data: c });
        act.company = Object.keys(c).length;
      }
    }
    if (d.offices?.length) {
      const base = await prisma.office.count({ where: { projectId: params.id } });
      await prisma.office.createMany({
        data: d.offices.map((o: any, i: number) => ({
          projectId: params.id,
          officeType: o.officeType || (base + i === 0 ? "MAIN" : "BRANCH"),
          officeName: o.officeName || "（事業所名未記載）",
          officeNumber: o.officeNumber || null,
          employeeCount: Number(o.employeeCount ?? 0),
          address: o.address || null,
          sortOrder: base + i,
        })),
      });
      act.offices = d.offices.length;
    }
    if (d.trainees?.length) {
      await prisma.trainee.createMany({
        data: d.trainees.map((t: any) => ({
          projectId: params.id,
          fullName: t.fullName || "（氏名未記載）",
          gender: t.gender || null,
          employmentInsuranceNumber: t.employmentInsuranceNumber || null,
          employmentType: t.employmentType || null,
          currentJobRole: t.currentJobRole || null,
          futureJobRole: t.futureJobRole || null,
          targetTrainingName: t.targetTrainingName || null,
          isExecutiveDualRole: !!t.isExecutiveDualRole,
          isOnChildcareLeave: !!t.isOnChildcareLeave,
          isRemoteTraining: !!t.isRemoteTraining,
        })),
      });
      act.trainees = d.trainees.length;
    }
    if (d.trainings?.length) {
      for (const t of d.trainings) {
        await prisma.training.create({
          data: {
            projectId: params.id,
            trainingName: t.trainingName || "（研修名未記載）",
            providerName: t.providerName || null,
            trainingFormat: t.trainingFormat || "LIVE_ONLINE",
            trainingStartDate: t.trainingStartDate ? new Date(t.trainingStartDate) : null,
            trainingEndDate: t.trainingEndDate ? new Date(t.trainingEndDate) : null,
            totalTrainingHours: Number(t.totalTrainingHours ?? 0),
            standardLearningHours: t.standardLearningHours ? Number(t.standardLearningHours) : null,
            tuitionFee: Number(t.tuitionFee ?? 0),
            materialFee: t.materialFee ? Number(t.materialFee) : null,
            curriculumText: t.curriculumText || null,
            completionCondition: t.completionCondition || null,
            instructionType: t.instructionType || "BUSINESS_ORDER",
            trainingType: t.trainingType || "OFF_JT",
            relationToBusinessExpansion: t.relationToBusinessExpansion || null,
            relationToDxGx: t.relationToDxGx || null,
            relationToFutureRole: t.relationToFutureRole || null,
          },
        });
      }
      act.trainings = d.trainings.length;
    }
    if (d.internalPlan && Object.keys(d.internalPlan).length > 0) {
      const p: any = { ...d.internalPlan };
      for (const k of Object.keys(p)) if (p[k] === "" || p[k] === null) delete p[k];
      if (Object.keys(p).length > 0) {
        await prisma.internalCapabilityPlan.upsert({
          where: { projectId: params.id },
          create: { ...p, projectId: params.id },
          update: p,
        });
        act.internalPlan = Object.keys(p).length;
      }
    }
    applied = act;
  }

  await logActivity(
    params.id,
    user.id,
    "AI_FILL_STEP",
    `AI入力代行: ${params.stepCode} / 反映: ${JSON.stringify(applied)}`
  );

  return NextResponse.json({ data, applied });
}
