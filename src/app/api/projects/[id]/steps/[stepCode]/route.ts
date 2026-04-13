import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepCode: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const step = await prisma.projectStep.update({
    where: {
      projectId_stepCode: {
        projectId: params.id,
        stepCode: params.stepCode as any,
      },
    },
    data: {
      stepStatus: body.stepStatus,
      completedAt: body.stepStatus === "COMPLETED" ? new Date() : null,
      lastSavedAt: new Date(),
      lastSavedBy: user.id,
      comment: body.comment ?? undefined,
    },
  });
  // プロジェクトのprogress再計算
  const allSteps = await prisma.projectStep.findMany({ where: { projectId: params.id } });
  const doneCount = allSteps.filter((s) => s.stepStatus === "COMPLETED").length;
  const progress = Math.round((doneCount / allSteps.length) * 100);
  await prisma.project.update({
    where: { id: params.id },
    data: { progressPercent: progress },
  });
  await logActivity(params.id, user.id, "STEP_UPDATED", `${params.stepCode} を更新`);
  return NextResponse.json({ step });
}
