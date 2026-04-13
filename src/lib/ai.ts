// ================================
// AI モックロジック
// ================================
// 実運用時は LLM API（OpenAI / Anthropic / Gemini 等）に差し替え可能な
// インターフェイスとして設計しています。`generate*` 関数を外部APIに置換
// することでフロー全体はそのまま利用できます。

import type {
  Project,
  Training,
  Trainee,
  RequiredDocument,
  InternalCapabilityPlan,
  Company,
  Office,
} from "@prisma/client";

export const RISK_WORDS = [
  "一般教養",
  "マナー",
  "説明会",
  "会議",
  "通常業務",
  "単なる操作説明",
];

export type AIFinding = {
  checkType:
    | "COURSE_MATCH"
    | "MISSING_DOCUMENT"
    | "INVALID_INPUT"
    | "RISK_DETECTION"
    | "DEADLINE_ALERT"
    | "TARGET_TRAINING_WARNING";
  severity: "INFO" | "WARNING" | "ERROR";
  title: string;
  detail: string;
  relatedStepCode?:
    | "STEP_1_DOCUMENT_GUIDE"
    | "STEP_2_COMPANY_INFO"
    | "STEP_3_OFFICES"
    | "STEP_4_TRAINEES"
    | "STEP_5_TRAINING_INFO"
    | "STEP_6_INTERNAL_PLAN"
    | "STEP_7_UPLOADS"
    | "STEP_8_AI_CHECK"
    | "STEP_9_DRAFTS"
    | "STEP_10_HANDOFF";
};

export type CourseMatchResult = "ELIGIBLE" | "NEEDS_MORE_INFO" | "LIKELY_INELIGIBLE";

/** コース該当性判定（事業展開等リスキリング支援コース） */
export function judgeCourseMatch(training: Training): {
  result: CourseMatchResult;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (training.totalTrainingHours >= 10) score += 1;
  else reasons.push("総訓練時間が10時間未満です（必須要件未充足の可能性）");

  if (training.trainingType === "OFF_JT" || training.trainingType === "OFF_JT_OJT") score += 1;
  else reasons.push("OFF-JTに該当しない可能性があります");

  const relation = [
    training.relationToBusinessExpansion,
    training.relationToDxGx,
    training.relationToFutureRole,
  ]
    .filter(Boolean)
    .join(" ");
  if (relation && relation.length >= 40) score += 1;
  else reasons.push("事業展開／DX・GX／将来職務との関連記述が不足しています");

  for (const word of RISK_WORDS) {
    if (
      training.trainingName.includes(word) ||
      (training.curriculumText ?? "").includes(word)
    ) {
      reasons.push(`対象外の可能性があるワードを検出: 「${word}」`);
      score -= 2;
      break;
    }
  }

  if (score >= 3) return { result: "ELIGIBLE", reasons };
  if (score >= 1) return { result: "NEEDS_MORE_INFO", reasons };
  return { result: "LIKELY_INELIGIBLE", reasons };
}

/** 不足書類判定 */
export function judgeMissingDocuments(
  trainees: Trainee[],
  trainings: Training[],
  required: RequiredDocument[]
): AIFinding[] {
  const findings: AIFinding[] = [];
  const typesPresent = new Set(required.map((r) => r.documentType));

  const needTelework = trainees.some((t) => t.isRemoteTraining);
  const needExecutive = trainees.some((t) => t.isExecutiveDualRole);
  const needChildcare = trainees.some((t) => t.isOnChildcareLeave);

  if (needTelework && !typesPresent.has("TELEWORK_RULES")) {
    findings.push({
      checkType: "MISSING_DOCUMENT",
      severity: "WARNING",
      title: "テレワーク規程が不足しています",
      detail: "自宅受講者がいるためテレワーク規程の提出が必要です。",
      relatedStepCode: "STEP_7_UPLOADS",
    });
  }
  if (needExecutive && !typesPresent.has("EXECUTIVE_EMPLOYMENT_CERT")) {
    findings.push({
      checkType: "MISSING_DOCUMENT",
      severity: "WARNING",
      title: "兼務役員雇用実態証明書が不足しています",
      detail: "兼務役員の受講者がいるため雇用実態証明書の提出が必要です。",
      relatedStepCode: "STEP_7_UPLOADS",
    });
  }
  if (needChildcare && !typesPresent.has("CHILDCARE_LEAVE_FORM")) {
    findings.push({
      checkType: "MISSING_DOCUMENT",
      severity: "WARNING",
      title: "育児休業申出書が不足しています",
      detail: "育休中の受講者がいるため育児休業申出書の提出が必要です。",
      relatedStepCode: "STEP_7_UPLOADS",
    });
  }
  if (!typesPresent.has("INTERNAL_CAPABILITY_PLAN")) {
    findings.push({
      checkType: "MISSING_DOCUMENT",
      severity: "ERROR",
      title: "事業内職業能力開発計画が未提出です",
      detail: "必須書類です。Step6で作成しアップロードしてください。",
      relatedStepCode: "STEP_7_UPLOADS",
    });
  }
  if (trainings.length > 0 && !typesPresent.has("CURRICULUM")) {
    findings.push({
      checkType: "MISSING_DOCUMENT",
      severity: "WARNING",
      title: "カリキュラムが未提出です",
      detail: "訓練内容の確認にカリキュラムが必要です。",
      relatedStepCode: "STEP_7_UPLOADS",
    });
  }
  return findings;
}

/** リスク検知 */
export function detectRisks(trainings: Training[], trainees: Trainee[]): AIFinding[] {
  const findings: AIFinding[] = [];
  for (const t of trainings) {
    if (t.totalTrainingHours > 0 && t.totalTrainingHours < 10) {
      findings.push({
        checkType: "RISK_DETECTION",
        severity: "WARNING",
        title: `「${t.trainingName}」の総訓練時間が10時間未満です`,
        detail: "事業展開等リスキリング支援コースは10時間以上が必須です。",
        relatedStepCode: "STEP_5_TRAINING_INFO",
      });
    }
    const rel = (t.relationToBusinessExpansion ?? "") + (t.relationToDxGx ?? "");
    if (rel.length > 0 && rel.length < 40) {
      findings.push({
        checkType: "RISK_DETECTION",
        severity: "WARNING",
        title: `「${t.trainingName}」の事業展開等との関連記述が短すぎます`,
        detail: "審査では目的と関連性が重視されます。40文字以上を目安に具体的に記述してください。",
        relatedStepCode: "STEP_5_TRAINING_INFO",
      });
    }
    for (const word of RISK_WORDS) {
      if (t.trainingName.includes(word) || (t.curriculumText ?? "").includes(word)) {
        findings.push({
          checkType: "TARGET_TRAINING_WARNING",
          severity: "ERROR",
          title: `対象外ワードを検出: 「${word}」`,
          detail: `訓練「${t.trainingName}」で対象外の可能性があるワードを検出しました。内容確認が必要です。`,
          relatedStepCode: "STEP_5_TRAINING_INFO",
        });
        break;
      }
    }
    if (
      (t.trainingFormat === "E_LEARNING" || t.trainingFormat === "CORRESPONDENCE") &&
      !t.standardLearningHours &&
      !t.standardLearningPeriod
    ) {
      findings.push({
        checkType: "INVALID_INPUT",
        severity: "WARNING",
        title: `「${t.trainingName}」で標準学習時間／期間が未入力です`,
        detail: "eラーニング・通信訓練は標準学習時間または標準学習期間で判定します。",
        relatedStepCode: "STEP_5_TRAINING_INFO",
      });
    }
  }
  for (const tr of trainees) {
    if (!tr.futureJobRole) {
      findings.push({
        checkType: "INVALID_INPUT",
        severity: "WARNING",
        title: `${tr.fullName} の将来従事予定職務が未入力です`,
        detail: "将来職務との関連性は審査で重視されるため、必ず記入してください。",
        relatedStepCode: "STEP_4_TRAINEES",
      });
    }
  }
  return findings;
}

/** 計画届提出期限チェック */
export function checkDeadline(project: Pick<Project, "trainingStartDate" | "planSubmissionDeadline">): AIFinding[] {
  const findings: AIFinding[] = [];
  if (!project.trainingStartDate) return findings;
  const now = new Date();
  const start = new Date(project.trainingStartDate);
  const oneMonthBefore = new Date(start);
  oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
  const sixMonthsBefore = new Date(start);
  sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);
  if (now > oneMonthBefore) {
    findings.push({
      checkType: "DEADLINE_ALERT",
      severity: "ERROR",
      title: "計画届提出期限を超過している可能性があります",
      detail: "計画届は訓練開始日の1か月前までの提出が必要です。早急に確認してください。",
      relatedStepCode: "STEP_1_DOCUMENT_GUIDE",
    });
  } else if (now < sixMonthsBefore) {
    findings.push({
      checkType: "DEADLINE_ALERT",
      severity: "INFO",
      title: "計画届提出可能期間の前です",
      detail: "計画届は訓練開始日の6か月前から提出可能です。",
      relatedStepCode: "STEP_1_DOCUMENT_GUIDE",
    });
  }
  return findings;
}

/** Step6 事業内職業能力開発計画ドラフト生成（モック） */
export function generateInternalPlanDraft(
  company: Pick<Company, "companyName">,
  plan: InternalCapabilityPlan
): string {
  const join = (label: string, v?: string | null) => (v ? `■ ${label}\n${v}\n` : "");
  return [
    `${company.companyName} 事業内職業能力開発計画（ドラフト）`,
    "",
    "【第1章 経営理念・経営方針】",
    join("経営理念", plan.managementPhilosophy),
    join("経営方針", plan.managementPolicy),
    join("今後の事業展開方針", plan.futureBusinessPolicy),
    join("強化したい分野", plan.focusArea),
    join("企業として重視する人材像", plan.idealHumanResource),
    "【第2章 人材育成の基本方針・目標】",
    join("人材育成の基本方針", plan.hrBasicPolicy),
    join("職位別育成の考え方", plan.roleBasedDevelopmentPolicy),
    join("教育訓練の目的", plan.trainingPurpose),
    join("キャリア形成支援の考え方", plan.careerSupportPolicy),
    join("自己啓発支援の考え方", plan.selfDevelopmentSupportPolicy),
    "【第3章 昇進昇格・人事考課等】",
    join("配置方針", plan.placementPolicy),
    join("昇進・昇格判断基準", plan.promotionCriteria),
    join("人事評価基準", plan.evaluationCriteria),
    join("資格取得の評価反映", plan.qualificationReflection),
    "【第4章 職務に必要な能力】",
    join("幹部社員に求める能力", plan.executiveSkillRequirements),
    join("一般・中堅社員に求める能力", plan.midlevelSkillRequirements),
    join("新入・若手社員に求める能力", plan.juniorSkillRequirements),
    "",
    "※ 本ドラフトはAIによる自動生成です。社内レビューのうえ、最終版として確定してください。",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 事業展開等実施計画説明文 */
export function generateBusinessExpansionDescription(
  company: Pick<Company, "companyName">,
  trainings: Training[]
): string {
  const names = trainings.map((t) => `・${t.trainingName}`).join("\n") || "・（訓練未登録）";
  return [
    `${company.companyName}では、新たな事業展開および業務プロセス改革に対応するため、`,
    `以下の訓練を通じて必要な専門知識・技能の習得を進めます。`,
    "",
    "【対象訓練】",
    names,
    "",
    "受講者は訓練修了後、事業展開に直接関連する新たな業務に従事する予定です。",
    "※ 本文章はAIドラフトです。実際の申請時は各訓練の内容と実態に合わせて修正してください。",
  ].join("\n");
}

/** DX/GX説明文 */
export function generateDxGxDescription(trainings: Training[]): string {
  const bullets = trainings
    .map((t) => `・${t.trainingName}: ${t.relationToDxGx || "（DX/GXとの関連を追記してください）"}`)
    .join("\n");
  return [
    "当社はデジタル化およびグリーントランスフォーメーション（GX）の推進に向け、",
    "以下の訓練を通じて従業員のデジタル技術・環境対応スキルの底上げを図ります。",
    "",
    bullets || "（訓練未登録）",
  ].join("\n");
}

/** 将来職務との関連説明 */
export function generateFutureRoleDescription(trainees: Trainee[]): string {
  const lines = trainees
    .map(
      (t) =>
        `・${t.fullName}: ${t.currentJobRole ?? "（現職未記載）"} → ${
          t.futureJobRole ?? "（将来職務未記載）"
        }`
    )
    .join("\n");
  return [
    "訓練受講者は、本訓練の修了後に以下の新たな職務に従事することを予定しています。",
    "",
    lines || "（受講者未登録）",
  ].join("\n");
}

export function generateReminderMessage(projectName: string, missing: string[]): string {
  return [
    `件名: 【${projectName}】提出書類ご提出のお願い`,
    "",
    "お世話になっております。",
    "現在、以下の書類が未提出となっております。お忙しいところ恐れ入りますが、ご確認・ご提出をお願いいたします。",
    "",
    ...missing.map((m) => `・${m}`),
    "",
    "不明点がございましたらお気軽にご連絡ください。",
  ].join("\n");
}

export function generateHandoffMemo(project: {
  projectName: string;
  company: { companyName: string };
  trainings: Training[];
  trainees: Trainee[];
  offices: Office[];
}): string {
  return [
    `【社労士向け引継ぎメモ】`,
    `案件名: ${project.projectName}`,
    `企業名: ${project.company.companyName}`,
    `事業所数: ${project.offices.length}`,
    `受講者数: ${project.trainees.length}`,
    `訓練数: ${project.trainings.length}`,
    "",
    "■ 訓練一覧",
    ...project.trainings.map(
      (t) => `・${t.trainingName}（${t.totalTrainingHours}h / ${t.trainingFormat}）`
    ),
    "",
    "本案件はAIによる一次チェック済みです。AIチェック結果をあわせてご確認ください。",
  ].join("\n");
}
