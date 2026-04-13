import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      steps: true,
      offices: { orderBy: { sortOrder: "asc" } },
      trainees: true,
      trainings: true,
      requiredDocuments: true,
      uploadedFiles: true,
      internalPlan: true,
      aiCheckResults: { orderBy: { createdAt: "desc" } },
      aiGeneratedContents: { orderBy: { createdAt: "desc" } },
      handoffRecords: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  if (user.role === "CLIENT" && user.companyId !== project.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // BigInt対応
  const safe = JSON.parse(
    JSON.stringify(project, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ project: safe });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const allowed: any = {};
  for (const key of [
    "projectName",
    "status",
    "subsidyCourse",
    "currentStep",
    "progressPercent",
    "assignedSharoushiUserId",
    "assignedTrainingProviderUserId",
  ]) {
    if (key in data) allowed[key] = data[key];
  }
  for (const key of ["trainingStartDate", "trainingEndDate", "planSubmissionDeadline"]) {
    if (key in data) allowed[key] = data[key] ? new Date(data[key]) : null;
  }
  const project = await prisma.project.update({ where: { id: params.id }, data: allowed });
  await logActivity(project.id, user.id, "PROJECT_UPDATED", `案件を更新`);
  return NextResponse.json({ project });
}
