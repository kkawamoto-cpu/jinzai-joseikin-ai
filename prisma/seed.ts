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

  const pw = await bcrypt.hash("password", 10);

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

  const admin = await prisma.user.create({
    data: { name: "管理者", email: "admin@example.com", passwordHash: pw, role: "ADMIN" },
  });
  const client = await prisma.user.create({
    data: {
      name: "顧客企業担当者",
      email: "client@example.com",
      passwordHash: pw,
      role: "CLIENT",
      companyId: company.id,
    },
  });
  const sharoushi = await prisma.user.create({
    data: { name: "社労士ユーザー", email: "sharoushi@example.com", passwordHash: pw, role: "SHAROUSHI" },
  });
  const provider = await prisma.user.create({
    data: { name: "研修事業者ユーザー", email: "provider@example.com", passwordHash: pw, role: "TRAINING_PROVIDER" },
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
      createdBy: client.id,
      assignedSharoushiUserId: sharoushi.id,
      assignedTrainingProviderUserId: provider.id,
    },
  });

  // Steps
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
        lastSavedBy: idx <= 3 ? client.id : null,
      },
    });
  }

  // Offices
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

  // Trainees
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

  // Trainings
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
      {
        projectId: project1.id,
        trainingName: "Pythonによる業務自動化講座",
        providerName: "株式会社AIラーニング",
        trainingFormat: "E_LEARNING",
        trainingStartDate: new Date("2026-06-15"),
        trainingEndDate: new Date("2026-08-31"),
        totalTrainingHours: 30,
        standardLearningHours: 30,
        standardLearningPeriod: 60,
        tuitionFee: 88_000,
        instructionType: "BUSINESS_ORDER",
        trainingType: "OFF_JT",
        curriculumText: "Python基礎、Pandas、業務自動化スクリプト実装",
        completionCondition: "全章完了＋修了テスト合格",
        relationToBusinessExpansion: "業務プロセス改革に必要な自動化技術の習得",
        relationToDxGx: "定型業務のDX化・効率化を推進",
        relationToFutureRole: "DX推進担当への配置転換を前提とする",
        isTargetCourseMatch: true,
      },
    ],
  });

  // Required Documents
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
  await doc("TELEWORK_RULES", "テレワーク規程", false);

  // Internal Plan
  await prisma.internalCapabilityPlan.create({
    data: {
      projectId: project1.id,
      managementPhilosophy: "技術の力で社会課題を解決する。",
      managementPolicy: "顧客価値に直結するプロダクト開発と人材育成に投資する。",
      futureBusinessPolicy: "AI/DX事業の立ち上げと拡大",
      focusArea: "生成AI活用、データ分析、業務自動化",
      idealHumanResource: "自律的に学び、変化に対応できる人材",
      hrBasicPolicy: "全社員が新しい技術領域へチャレンジできる環境を整える",
    },
  });

  // AI チェック結果サンプル
  await prisma.aICheckResult.createMany({
    data: [
      {
        projectId: project1.id,
        checkType: "COURSE_MATCH",
        severity: "INFO",
        title: "事業展開等リスキリング支援コースに該当可能性あり",
        detail: "訓練内容・時間・関連性の3観点でスコアを満たしています。",
        relatedStepCode: "STEP_5_TRAINING_INFO",
      },
      {
        projectId: project1.id,
        checkType: "MISSING_DOCUMENT",
        severity: "WARNING",
        title: "テレワーク規程が未提出です",
        detail: "自宅受講予定の受講者がいるためテレワーク規程が必要です。",
        relatedStepCode: "STEP_7_UPLOADS",
      },
    ],
  });

  // AI生成コンテンツサンプル
  await prisma.aIGeneratedContent.create({
    data: {
      projectId: project1.id,
      contentType: "INTERNAL_PLAN_DRAFT",
      title: "事業内職業能力開発計画ドラフト v1",
      contentText: "（サンプル）事業内職業能力開発計画の初期ドラフトです。Step6で最新化できます。",
      version: 1,
    },
  });

  // 案件2（新規）
  const project2 = await prisma.project.create({
    data: {
      projectName: "2026年度下期 DX基礎研修",
      companyId: company.id,
      subsidyCourse: "JIGYO_TENKAI_RESKILLING",
      status: "DRAFT",
      trainingStartDate: new Date("2026-10-01"),
      trainingEndDate: new Date("2026-12-28"),
      planSubmissionDeadline: new Date("2026-09-01"),
      progressPercent: 5,
      currentStep: "STEP_1_DOCUMENT_GUIDE",
      createdBy: client.id,
    },
  });
  for (const code of stepCodes) {
    await prisma.projectStep.create({
      data: { projectId: project2.id, stepCode: code, stepStatus: "NOT_STARTED" },
    });
  }

  console.log("✅ Seed complete.");
  console.log("ログイン情報: admin@example.com / client@example.com / sharoushi@example.com / provider@example.com");
  console.log("パスワード: password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
