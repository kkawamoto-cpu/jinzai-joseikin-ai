import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  judgeCourseMatch,
  judgeMissingDocuments,
  detectRisks,
  checkDeadline,
} from "@/lib/ai";
import { logActivity } from "@/lib/api";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      trainings: true,
      trainees: true,
      requiredDocuments: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  // 既存結果を削除
  await prisma.aICheckResult.deleteMany({ where: { projectId: params.id } });

  const findings = [
    ...detectRisks(project.trainings, project.trainees),
    ...judgeMissingDocuments(project.trainees, project.trainings, project.requiredDocuments),
    ...checkDeadline(project),
  ];

  for (const t of project.trainings) {
    const j = judgeCourseMatch(t);
    findings.push({
      checkType: "COURSE_MATCH",
      severity: j.result === "ELIGIBLE" ? "INFO" : j.result === "NEEDS_MORE_INFO" ? "WARNING" : "ERROR",
      title: `「${t.trainingName}」のコース該当性: ${
        j.result === "ELIGIBLE"
          ? "該当可能"
          : j.result === "NEEDS_MORE_INFO"
          ? "追加説明が必要"
          : "対象外の可能性"
      }`,
      detail: j.reasons.join(" / ") || "問題は検出されませんでした",
      relatedStepCode: "STEP_5_TRAINING_INFO",
    });
    // コース該当性をTrainingにも反映
    await prisma.training.update({
      where: { id: t.id },
      data: { isTargetCourseMatch: j.result === "ELIGIBLE" },
    });
  }

  await prisma.aICheckResult.createMany({
    data: findings.map((f) => ({ ...f, projectId: params.id })),
  });

  await prisma.project.update({
    where: { id: params.id },
    data: {
      status: findings.some((f) => f.severity === "ERROR") ? "NEEDS_FIX" : "AI_CHECKED",
    },
  });
  await logActivity(params.id, user.id, "AI_CHECK_EXECUTED", `${findings.length} 件の結果`);
  return NextResponse.json({ findings });
}
