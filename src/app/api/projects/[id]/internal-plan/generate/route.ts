import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInternalPlanDraft } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true, internalPlan: true },
  });
  if (!project?.internalPlan)
    return NextResponse.json({ error: "事業内職業能力開発計画の入力が必要です" }, { status: 400 });

  const text = generateInternalPlanDraft(project.company, project.internalPlan);
  await prisma.internalCapabilityPlan.update({
    where: { projectId: params.id },
    data: { generatedDocumentText: text },
  });
  const content = await prisma.aIGeneratedContent.create({
    data: {
      projectId: params.id,
      contentType: "INTERNAL_PLAN_DRAFT",
      title: "事業内職業能力開発計画ドラフト",
      contentText: text,
      version: 1,
      generatedBy: user.id,
    },
  });
  await logActivity(params.id, user.id, "DRAFT_GENERATED", "事業内職業能力開発計画ドラフト生成");
  return NextResponse.json({ content });
}
