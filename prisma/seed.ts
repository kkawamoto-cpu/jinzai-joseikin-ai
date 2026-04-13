import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // クリーンアップ
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.handoffRecord.deleteMany();
  await prisma.aIGeneratedContent.deleteMany();
  await prisma.aICheckResult.deleteMany();
  await prisma.internalCapabilityPlan.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.requiredDocument.deleteMany();
  await prisma.training.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.office.deleteMany();
  await prisma.projectStep.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Hucha Holdings（メイン）と AI助成くん（ゲスト）の2アカウント
  const mainPw = await bcrypt.hash("Huchaholdings0104", 10);
  const guestPw = await bcrypt.hash("aijoseikun", 10);

  const company = await prisma.company.create({
    data: {
      companyName: "株式会社サンプルテック",
      representativeName: "山田 太郎",
      representativeTitle: "代表取締役",
      headOfficeAddress: "東京都千代田区丸の内1-1-1",
      headOfficePhone: "03-1234-5678",
      capitalAmount: BigInt(50_000_000),
      corporateNumber: "1234567890123",
      employeeCount: 85,
      employmentInsuranceOfficeNumber: "12345678901",
      industryCode: "39",
      branchCount: 2,
      laborRepresentativeName: "鈴木 一郎",
      trainingPromotionDepartment: "人事部",
      trainingPromotionTitle: "部長",
      trainingPromotionName: "佐藤 花子",
    },
  });

  const demo = await prisma.user.create({
    data: {
      name: "Hucha Holdings",
      email: "info@hucha.co.jp",
      passwordHash: mainPw,
      role: "ADMIN",
      companyId: company.id,
    },
  });
  await prisma.user.create({
    data: {
      name: "AI助成くん ゲスト",
      email: "info@aijoseikun.com",
      passwordHash: guestPw,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  // 案件1（入力途中）
  const project1 = await prisma.project.create({
    data: {
      projectName: "2026年度 AI・DXリスキリング訓練",
      companyId: company.id,
      subsidyCourse: "JIGYO_TENKAI_RESKILLING",
      status: "INPUTTING",
      trainingStartDate: new Date("2026-06-01"),
      trainingEndDate: new Date("2026-08-31"),
      planSubmissionDeadline: new Date("2026-05-01"),
      progressPercent: 40,
      currentStep: "STEP_4_TRAINEES",
      createdBy: demo.id,
    },
  });

  const stepCodes = [
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
  ] as const;
  for (const code of stepCodes) {
    const idx = stepCodes.indexOf(code);
    await prisma.projectStep.create({
      data: {
        projectId: project1.id,
        stepCode: code,
        stepStatus: idx < 3 ? "COMPLETED" : idx === 3 ? "IN_PROGRESS" : "NOT_STARTED",
        lastSavedAt: idx <= 3 ? new Date() : null,
        lastSavedBy: idx <= 3 ? demo.id : null,
      },
    });
  }

  const main = await prisma.office.create({
    data: {
      projectId: project1.id,
      officeType: "MAIN",
      officeName: "本社",
      officeNumber: "12345678901",
      employeeCount: 60,
      address: "東京都千代田区丸の内1-1-1",
      sortOrder: 0,
    },
  });
  await prisma.office.create({
    data: {
      projectId: project1.id,
      officeType: "BRANCH",
      officeName: "大阪支社",
      officeNumber: "98765432101",
      employeeCount: 25,
      address: "大阪府大阪市北区梅田2-2-2",
      sortOrder: 1,
    },
  });

  await prisma.trainee.createMany({
    data: [
      {
        projectId: project1.id,
        officeId: main.id,
        fullName: "田中 次郎",
        gender: "男性",
        employmentInsuranceNumber: "1234-567890-1",
        employmentType: "正社員",
        currentJobRole: "営業",
        futureJobRole: "データ分析担当",
        targetTrainingName: "生成AI活用講座",
      },
      {
        projectId: project1.id,
        officeId: main.id,
        fullName: "高橋 三郎",
        gender: "男性",
        employmentInsuranceNumber: "2345-678901-2",
        employmentType: "正社員",
        isRemoteTraining: true,
        currentJobRole: "事務",
        futureJobRole: "DX推進担当",
        targetTrainingName: "Pythonによる業務自動化講座",
      },
    ],
  });

  await prisma.training.createMany({
    data: [
      {
        projectId: project1.id,
        trainingName: "生成AI活用講座",
        providerName: "株式会社AIラーニング",
        trainingFormat: "LIVE_ONLINE",
        trainingStartDate: new Date("2026-06-01"),
        trainingEndDate: new Date("2026-07-15"),
        totalTrainingHours: 40,
        tuitionFee: 220_000,
        materialFee: 10_000,
        instructorName: "講師A",
        curriculumText: "LLMの基礎、プロンプト設計、社内業務適用演習",
        completionCondition: "全回出席かつ最終課題合格",
        instructionType: "BUSINESS_ORDER",
        trainingType: "OFF_JT",
        relationToBusinessExpansion: "新規事業であるAIソリューション提案を担う人材の育成のため必須",
        relationToDxGx: "社内DX推進に直結する生成AI活用スキルの獲得",
        relationToFutureRole: "訓練後はデータ分析・DX推進職務に従事予定",
        isTargetCourseMatch: true,
      },
    ],
  });

  const doc = async (type: any, name: string, required = true) =>
    prisma.requiredDocument.create({
      data: { projectId: project1.id, documentType: type, documentName: name, isRequired: required },
    });
  await doc("POWER_OF_ATTORNEY", "委任契約書");
  await doc("CONSENT_FORM", "申請同意書");
  await doc("EMPLOYMENT_CONTRACT", "最新の労働条件通知書または雇用契約書");
  await doc("INTERNAL_CAPABILITY_PLAN", "事業内職業能力開発計画");
  await doc("CURRICULUM", "カリキュラム");
  await doc("COURSE_GUIDE", "受講案内");

  await prisma.internalCapabilityPlan.create({
    data: {
      projectId: project1.id,
      managementPhilosophy: "技術の力で社会課題を解決する。",
      managementPolicy: "顧客価値に直結するプロダクト開発と人材育成に投資する。",
      futureBusinessPolicy: "AI/DX事業の立ち上げと拡大",
      focusArea: "生成AI活用、データ分析、業務自動化",
      idealHumanResource: "自律的に学び、変化に対応できる人材",
    },
  });

  console.log("✅ Seed complete.");
  console.log("メイン: info@hucha.co.jp / Huchaholdings0104");
  console.log("ゲスト: info@aijoseikun.com / aijoseikun");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
