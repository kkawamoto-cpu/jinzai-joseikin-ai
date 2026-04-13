import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  generateBusinessExpansionDescription,
  generateDxGxDescription,
  generateFutureRoleDescription,
  generateHandoffMemo,
  generateReminderMessage,
  generateInternalPlanDraft,
} from "@/lib/ai";
import { logActivity } from "@/lib/api";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      trainings: true,
      trainees: true,
      offices: true,
      requiredDocuments: true,
      internalPlan: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const drafts: Array<{ contentType: any; title: string; contentText: string }> = [
    {
      contentType: "BUSINESS_EXPANSION_DESCRIPTION",
      title: "事業展開等実施計画説明文",
      contentText: generateBusinessExpansionDescription(project.company, project.trainings),
    },
    {
      contentType: "DX_GX_DESCRIPTION",
      title: "DX/GX化説明文",
      contentText: generateDxGxDescription(project.trainings),
    },
    {
      contentType: "FUTURE_ROLE_DESCRIPTION",
      title: "将来職務との関連説明文",
      contentText: generateFutureRoleDescription(project.trainees),
    },
    {
      contentType: "REMINDER_MESSAGE",
      title: "不足資料催促文",
      contentText: generateReminderMessage(
        project.projectName,
        project.requiredDocuments.filter((d) => d.status === "NOT_SUBMITTED").map((d) => d.documentName)
      ),
    },
    {
      contentType: "HANDOFF_MEMO",
      title: "社労士引継ぎメモ",
      contentText: generateHandoffMemo(project),
    },
  ];
  if (project.internalPlan) {
    drafts.push({
      contentType: "INTERNAL_PLAN_DRAFT",
      title: "事業内職業能力開発計画ドラフト",
      contentText: generateInternalPlanDraft(project.company, project.internalPlan),
    });
  }

  // 既存ドラフトを削除（バージョン管理したい場合は残す設計にする）
  await prisma.aIGeneratedContent.deleteMany({ where: { projectId: params.id } });
  await prisma.aIGeneratedContent.createMany({
    data: drafts.map((d) => ({
      projectId: params.id,
      contentType: d.contentType,
      title: d.title,
      contentText: d.contentText,
      version: 1,
      generatedBy: user.id,
    })),
  });
  await logActivity(params.id, user.id, "DRAFT_GENERATED", `${drafts.length} 件のドラフト生成`);
  const contents = await prisma.aIGeneratedContent.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ contents });
}
