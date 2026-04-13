import { z } from "zod";

export const CorporateNumber = z
  .string()
  .regex(/^\d{13}$/, "法人番号は13桁の数字で入力してください");

export const EmploymentInsuranceOfficeNumber = z
  .string()
  .regex(/^\d{11}$/, "雇用保険適用事業所番号は11桁の数字で入力してください");

export const NonNegativeInt = z
  .number({ invalid_type_error: "数値で入力してください" })
  .int()
  .min(0, "0以上の整数で入力してください");

export const CompanyInput = z.object({
  companyName: z.string().min(1, "企業名は必須です"),
  representativeName: z.string().optional().nullable(),
  representativeTitle: z.string().optional().nullable(),
  headOfficeAddress: z.string().optional().nullable(),
  headOfficePhone: z.string().optional().nullable(),
  capitalAmount: z.union([z.number(), z.bigint()]).optional().nullable(),
  corporateNumber: CorporateNumber.optional().or(z.literal("").transform(() => undefined)),
  employeeCount: NonNegativeInt.optional().nullable(),
  employmentInsuranceOfficeNumber: EmploymentInsuranceOfficeNumber.optional().or(
    z.literal("").transform(() => undefined)
  ),
  industryCode: z.string().optional().nullable(),
  branchCount: NonNegativeInt.optional().nullable(),
  laborRepresentativeName: z.string().optional().nullable(),
  trainingPromotionDepartment: z.string().optional().nullable(),
  trainingPromotionTitle: z.string().optional().nullable(),
  trainingPromotionName: z.string().optional().nullable(),
});

export const OfficeInput = z.object({
  officeType: z.enum(["MAIN", "BRANCH"]).default("BRANCH"),
  officeName: z.string().min(1, "事業所名は必須です"),
  officeNumber: z.string().optional().nullable(),
  employeeCount: NonNegativeInt.default(0),
  address: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const TraineeInput = z.object({
  officeId: z.string().optional().nullable(),
  fullName: z.string().min(1, "氏名は必須です"),
  gender: z.string().optional().nullable(),
  employmentInsuranceNumber: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  isExecutiveDualRole: z.boolean().default(false),
  isOnChildcareLeave: z.boolean().default(false),
  isRemoteTraining: z.boolean().default(false),
  currentJobRole: z.string().optional().nullable(),
  futureJobRole: z.string().optional().nullable(),
  targetTrainingName: z.string().optional().nullable(),
});

export const TrainingInput = z
  .object({
    trainingName: z.string().min(1, "研修名は必須です"),
    providerName: z.string().optional().nullable(),
    trainingFormat: z.enum([
      "ONSITE",
      "LIVE_ONLINE",
      "E_LEARNING",
      "CORRESPONDENCE",
      "SUBSCRIPTION",
    ]),
    trainingStartDate: z.string().optional().nullable(),
    trainingEndDate: z.string().optional().nullable(),
    totalTrainingHours: NonNegativeInt.default(0),
    standardLearningHours: NonNegativeInt.optional().nullable(),
    standardLearningPeriod: NonNegativeInt.optional().nullable(),
    tuitionFee: NonNegativeInt.default(0),
    admissionFee: NonNegativeInt.optional().nullable(),
    materialFee: NonNegativeInt.optional().nullable(),
    location: z.string().optional().nullable(),
    instructorName: z.string().optional().nullable(),
    curriculumText: z.string().optional().nullable(),
    completionCondition: z.string().optional().nullable(),
    instructionType: z.enum(["BUSINESS_ORDER", "VOLUNTARY"]),
    trainingType: z.enum(["OFF_JT", "OFF_JT_OJT"]),
    relationToBusinessExpansion: z.string().optional().nullable(),
    relationToDxGx: z.string().optional().nullable(),
    relationToFutureRole: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      !v.trainingStartDate || !v.trainingEndDate || new Date(v.trainingStartDate) <= new Date(v.trainingEndDate),
    { message: "訓練開始日は終了日以前に設定してください", path: ["trainingEndDate"] }
  )
  .refine(
    (v) =>
      !["E_LEARNING", "CORRESPONDENCE"].includes(v.trainingFormat) ||
      !!v.standardLearningHours ||
      !!v.standardLearningPeriod,
    {
      message: "eラーニング・通信の場合は標準学習時間または標準学習期間が必須です",
      path: ["standardLearningHours"],
    }
  );

export const InternalPlanInput = z.object({
  managementPhilosophy: z.string().optional().nullable(),
  managementPolicy: z.string().optional().nullable(),
  futureBusinessPolicy: z.string().optional().nullable(),
  focusArea: z.string().optional().nullable(),
  idealHumanResource: z.string().optional().nullable(),
  hrBasicPolicy: z.string().optional().nullable(),
  roleBasedDevelopmentPolicy: z.string().optional().nullable(),
  trainingPurpose: z.string().optional().nullable(),
  careerSupportPolicy: z.string().optional().nullable(),
  selfDevelopmentSupportPolicy: z.string().optional().nullable(),
  placementPolicy: z.string().optional().nullable(),
  promotionCriteria: z.string().optional().nullable(),
  evaluationCriteria: z.string().optional().nullable(),
  qualificationReflection: z.string().optional().nullable(),
  executiveSkillRequirements: z.string().optional().nullable(),
  midlevelSkillRequirements: z.string().optional().nullable(),
  juniorSkillRequirements: z.string().optional().nullable(),
});
