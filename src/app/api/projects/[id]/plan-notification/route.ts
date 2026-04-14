import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generatePlanNotification, type PlanNotificationData } from "@/lib/planNotificationAI";
import { logActivity } from "@/lib/api";

/**
 * POST /api/projects/:id/plan-notification
 * 職業訓練実施計画届のドラフトを AI で生成。
 * 既存のプロジェクト情報（会社・訓練・受講者・計画）をすべて自動で収集。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      trainings: true,
      trainees: true,
      offices: { orderBy: { sortOrder: "asc" } },
      internalPlan: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const c = project.company;
  const planSummary = project.internalPlan
    ? [
        project.internalPlan.managementPhilosophy,
        project.internalPlan.managementPolicy,
        project.internalPlan.futureBusinessPolicy,
        project.internalPlan.hrBasicPolicy,
      ]
        .filter(Boolean)
        .join(" / ")
    : "";

  const data: PlanNotificationData = {
    companyName: c.companyName,
    representativeName: c.representativeName ?? "",
    representativeTitle: c.representativeTitle ?? "",
    corporateNumber: c.corporateNumber ?? "",
    headOfficeAddress: c.headOfficeAddress ?? "",
    headOfficePhone: c.headOfficePhone ?? "",
    employmentInsuranceOfficeNumber: c.employmentInsuranceOfficeNumber ?? "",
    employeeCount: c.employeeCount ?? 0,
    capitalAmount: c.capitalAmount ? `¥${Number(c.capitalAmount).toLocaleString()}` : "",
    industryCode: c.industryCode ?? "",
    trainingPromotionName: c.trainingPromotionName ?? "",
    trainingPromotionDepartment: c.trainingPromotionDepartment ?? "",
    trainingPromotionTitle: c.trainingPromotionTitle ?? "",
    laborRepresentativeName: c.laborRepresentativeName ?? "",
    trainings: project.trainings.map((t) => ({
      trainingName: t.trainingName,
      providerName: t.providerName ?? "",
      trainingFormat: t.trainingFormat,
      trainingType: t.trainingType,
      instructionType: t.instructionType,
      trainingStartDate: t.trainingStartDate?.toISOString().slice(0, 10) ?? "",
      trainingEndDate: t.trainingEndDate?.toISOString().slice(0, 10) ?? "",
      totalTrainingHours: t.totalTrainingHours,
      tuitionFee: t.tuitionFee,
      materialFee: t.materialFee ?? 0,
      location: t.location ?? "",
      instructorName: t.instructorName ?? "",
      curriculumText: t.curriculumText ?? "",
      completionCondition: t.completionCondition ?? "",
      relationToBusinessExpansion: t.relationToBusinessExpansion ?? "",
      relationToDxGx: t.relationToDxGx ?? "",
      relationToFutureRole: t.relationToFutureRole ?? "",
    })),
    trainees: project.trainees.map((t) => ({
      fullName: t.fullName,
      employmentInsuranceNumber: t.employmentInsuranceNumber ?? "",
      employmentType: t.employmentType ?? "",
      currentJobRole: t.currentJobRole ?? "",
      futureJobRole: t.futureJobRole ?? "",
      isExecutiveDualRole: t.isExecutiveDualRole,
    })),
    offices: project.offices.map((o) => ({
      officeName: o.officeName,
      officeNumber: o.officeNumber ?? "",
      employeeCount: o.employeeCount,
      address: o.address ?? "",
      officeType: o.officeType,
    })),
    internalPlanSummary: planSummary,
    submissionDate: project.planSubmissionDeadline?.toISOString().slice(0, 10) ?? "",
    subsidyCourse: project.subsidyCourse,
  };

  try {
    const markdown = await generatePlanNotification(data);

    // AI生成コンテンツとして保存
    await prisma.aIGeneratedContent.create({
      data: {
        projectId: params.id,
        contentType: "INTERNAL_PLAN_DRAFT",
        title: "職業訓練実施計画届ドラフト",
        contentText: markdown,
        version: 1,
        generatedBy: user.id,
      },
    });

    await logActivity(params.id, user.id, "PLAN_NOTIFICATION_GENERATED", "職業訓練実施計画届ドラフト生成");
    return NextResponse.json({ markdown });
  } catch (e: any) {
    console.error("plan notification generation error:", e);
    return NextResponse.json(
      { error: "計画届の生成に失敗しました: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
