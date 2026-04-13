import type { StepCode } from "@prisma/client";

export const STEP_ORDER: StepCode[] = [
  "STEP_1_DOCUMENT_GUIDE",
  "STEP_2_COMPANY_INFO",
  "STEP_3_OFFICES",
  "STEP_4_TRAINEES",
  "STEP_5_TRAINING_INFO",
  "STEP_6_INTERNAL_PLAN",
  "STEP_7_UPLOADS",
  "STEP_8_AI_CHECK",
  "STEP_9_DRAFTS",
  "STEP_10_HANDOFF",
];

export const STEP_LABELS: Record<StepCode, string> = {
  STEP_1_DOCUMENT_GUIDE: "Step1 必要書類案内",
  STEP_2_COMPANY_INFO: "Step2 企業基本情報",
  STEP_3_OFFICES: "Step3 事業所情報",
  STEP_4_TRAINEES: "Step4 受講者情報",
  STEP_5_TRAINING_INFO: "Step5 訓練情報",
  STEP_6_INTERNAL_PLAN: "Step6 事業内職業能力開発計画",
  STEP_7_UPLOADS: "Step7 必要書類アップロード",
  STEP_8_AI_CHECK: "Step8 AIチェック結果",
  STEP_9_DRAFTS: "Step9 ドラフト生成結果",
  STEP_10_HANDOFF: "Step10 社労士引継ぎ確認",
};

export const STEP_PATHS: Record<StepCode, string> = {
  STEP_1_DOCUMENT_GUIDE: "step1",
  STEP_2_COMPANY_INFO: "step2",
  STEP_3_OFFICES: "step3",
  STEP_4_TRAINEES: "step4",
  STEP_5_TRAINING_INFO: "step5",
  STEP_6_INTERNAL_PLAN: "step6",
  STEP_7_UPLOADS: "step7",
  STEP_8_AI_CHECK: "step8",
  STEP_9_DRAFTS: "step9",
  STEP_10_HANDOFF: "step10",
};
