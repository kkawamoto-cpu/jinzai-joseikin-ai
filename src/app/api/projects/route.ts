import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BASE_REQUIRED_DOCUMENTS, DOCUMENT_LABELS } from "@/lib/documents";
import { STEP_ORDER } from "@/lib/steps";
import { logActivity } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    user.role === "CLIENT" && user.companyId
      ? { companyId: user.companyId, isArchived: false }
      : { isArchived: false };
  const projects = await prisma.project.findMany({
    where,
    include: { company: true, steps: true },
    orderBy: { updatedAt: "desc" },
  });
  // BigInt(資本金等) をシリアライズ可能に変換
  const safe = JSON.parse(
    JSON.stringify(projects, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ projects: safe });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { projectName, companyId, subsidyCourse = "JIGYO_TENKAI_RESKILLING", trainingStartDate } = body;
  if (!projectName) return NextResponse.json({ error: "projectNameは必須です" }, { status: 400 });

  const targetCompanyId = companyId || user.companyId;
  if (!targetCompanyId)
    return NextResponse.json({ error: "companyIdが必要です" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      projectName,
      companyId: targetCompanyId,
      subsidyCourse,
      trainingStartDate: trainingStartDate ? new Date(trainingStartDate) : null,
      createdBy: user.id,
    },
  });

  await prisma.projectStep.createMany({
    data: STEP_ORDER.map((code) => ({ projectId: project.id, stepCode: code })),
  });

  await prisma.requiredDocument.createMany({
    data: BASE_REQUIRED_DOCUMENTS.map((type) => ({
      projectId: project.id,
      documentType: type,
      documentName: DOCUMENT_LABELS[type],
      isRequired: true,
    })),
  });

  await logActivity(project.id, user.id, "PROJECT_CREATED", `案件「${projectName}」を作成`);
  return NextResponse.json({ project }, { status: 201 });
}
