import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";
import type { ExtractedFormData } from "@/lib/gemini";

/**
 * POST /api/projects/:id/ai-apply
 * body: { data: ExtractedFormData, replace?: {offices?:bool, trainees?:bool, trainings?:bool} }
 * 抽出データを該当テーブルに書き込む。
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: ExtractedFormData = body.data || {};
  const replace = body.replace || {};

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const applied: Record<string, number> = {};

  // 会社情報
  if (data.company && Object.keys(data.company).length > 0) {
    const c: any = { ...data.company };
    if (c.capitalAmount !== undefined && c.capitalAmount !== null) {
      try {
        c.capitalAmount = BigInt(Math.round(Number(c.capitalAmount)));
      } catch {
        delete c.capitalAmount;
      }
    }
    // 空文字や未定義の値を除去（既存値を上書きしない）
    for (const k of Object.keys(c)) if (c[k] === "" || c[k] === null) delete c[k];
    await prisma.company.update({ where: { id: project.companyId }, data: c });
    applied.company = Object.keys(c).length;
  }

  // 事業所
  if (data.offices && data.offices.length > 0) {
    if (replace.offices) {
      await prisma.office.deleteMany({ where: { projectId: params.id } });
    }
    const base = await prisma.office.count({ where: { projectId: params.id } });
    await prisma.office.createMany({
      data: data.offices.map((o, i) => ({
        projectId: params.id,
        officeType: (o.officeType as any) || (base + i === 0 ? "MAIN" : "BRANCH"),
        officeName: o.officeName || "（事業所名未記載）",
        officeNumber: o.officeNumber || null,
        employeeCount: Number(o.employeeCount ?? 0),
        address: o.address || null,
        sortOrder: base + i,
      })),
    });
    applied.offices = data.offices.length;
  }

  // 受講者
  if (data.trainees && data.trainees.length > 0) {
    if (replace.trainees) {
      await prisma.trainee.deleteMany({ where: { projectId: params.id } });
    }
    await prisma.trainee.createMany({
      data: data.trainees.map((t) => ({
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
    applied.trainees = data.trainees.length;
  }

  // 訓練
  if (data.trainings && data.trainings.length > 0) {
    if (replace.trainings) {
      await prisma.training.deleteMany({ where: { projectId: params.id } });
    }
    for (const t of data.trainings) {
      await prisma.training.create({
        data: {
          projectId: params.id,
          trainingName: t.trainingName || "（研修名未記載）",
          providerName: t.providerName || null,
          trainingFormat: (t.trainingFormat as any) || "LIVE_ONLINE",
          trainingStartDate: t.trainingStartDate ? new Date(t.trainingStartDate) : null,
          trainingEndDate: t.trainingEndDate ? new Date(t.trainingEndDate) : null,
          totalTrainingHours: Number(t.totalTrainingHours ?? 0),
          standardLearningHours: t.standardLearningHours ? Number(t.standardLearningHours) : null,
          tuitionFee: Number(t.tuitionFee ?? 0),
          materialFee: t.materialFee ? Number(t.materialFee) : null,
          curriculumText: t.curriculumText || null,
          completionCondition: t.completionCondition || null,
          instructionType: (t.instructionType as any) || "BUSINESS_ORDER",
          trainingType: (t.trainingType as any) || "OFF_JT",
          relationToBusinessExpansion: t.relationToBusinessExpansion || null,
          relationToDxGx: t.relationToDxGx || null,
          relationToFutureRole: t.relationToFutureRole || null,
        },
      });
    }
    applied.trainings = data.trainings.length;
  }

  // 事業内職業能力開発計画
  if (data.internalPlan && Object.keys(data.internalPlan).length > 0) {
    const p: any = { ...data.internalPlan };
    for (const k of Object.keys(p)) if (p[k] === "" || p[k] === null) delete p[k];
    await prisma.internalCapabilityPlan.upsert({
      where: { projectId: params.id },
      create: { ...p, projectId: params.id },
      update: p,
    });
    applied.internalPlan = Object.keys(p).length;
  }

  await logActivity(params.id, user.id, "AI_EXTRACT_APPLIED", `AI抽出データを適用: ${JSON.stringify(applied)}`);
  return NextResponse.json({ applied });
}
