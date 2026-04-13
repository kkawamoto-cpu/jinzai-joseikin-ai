import type { DocumentType } from "@prisma/client";

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  POWER_OF_ATTORNEY: "委任契約書",
  CONSENT_FORM: "申請同意書",
  EMPLOYMENT_CONTRACT: "最新の労働条件通知書または雇用契約書",
  INTERNAL_CAPABILITY_PLAN: "事業内職業能力開発計画",
  TELEWORK_RULES: "テレワーク規程",
  EXECUTIVE_EMPLOYMENT_CERT: "兼務役員雇用実態証明書",
  CHILDCARE_LEAVE_FORM: "育児休業申出書",
  INVOICE: "請求書",
  RECEIPT: "領収書",
  PAYMENT_RECORD: "振込明細",
  COMPLETION_CERTIFICATE: "修了証",
  ATTENDANCE_RECORD: "出勤簿",
  PAYROLL_LEDGER: "賃金台帳",
  COURSE_GUIDE: "受講案内",
  CURRICULUM: "カリキュラム",
  CONTRACT: "契約書",
};

/** 計画届段階で必須の基本書類 */
export const BASE_REQUIRED_DOCUMENTS: DocumentType[] = [
  "POWER_OF_ATTORNEY",
  "CONSENT_FORM",
  "EMPLOYMENT_CONTRACT",
  "INTERNAL_CAPABILITY_PLAN",
  "COURSE_GUIDE",
  "CURRICULUM",
];
