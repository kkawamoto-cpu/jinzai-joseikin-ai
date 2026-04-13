import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  generateCurriculum,
  generateSchedule,
  generateProposal,
} from "@/lib/trainingDesignAI";

/** POST /api/training-design/:id/generate
 *  body: { kind: "curriculum" | "schedule" | "proposal", startDate?, participants?, feePerPerson? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const kind: string = body.kind;

  const design = await prisma.trainingDesign.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!design) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const messages = design.messagesJson ? JSON.parse(design.messagesJson) : [];

  if (kind === "curriculum") {
    const text = await generateCurriculum({
      title: design.title,
      clientNeeds: design.clientNeeds ?? undefined,
      meetingNotes: design.meetingNotes ?? undefined,
      targetAudience: design.targetAudience ?? undefined,
      targetGoal: design.targetGoal ?? undefined,
      messages,
    });
    await prisma.trainingDesign.update({
      where: { id: params.id },
      data: { curriculumText: text, status: "IN_PROGRESS" },
    });
    return NextResponse.json({ curriculumText: text });
  }
  if (kind === "schedule") {
    if (!design.curriculumText)
      return NextResponse.json(
        { error: "先にカリキュラムを生成してください" },
        { status: 400 }
      );
    const text = await generateSchedule(design.curriculumText, body.startDate);
    // JSON部分を抽出
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/(\[[\s\S]*\])/);
    const cleanJson = match ? match[1] : text;
    await prisma.trainingDesign.update({
      where: { id: params.id },
      data: { scheduleJson: cleanJson },
    });
    return NextResponse.json({ scheduleJson: cleanJson, raw: text });
  }
  if (kind === "proposal") {
    if (!design.curriculumText)
      return NextResponse.json(
        { error: "先にカリキュラムを生成してください" },
        { status: 400 }
      );
    const text = await generateProposal({
      title: design.title,
      clientCompanyName: design.company?.companyName,
      curriculum: design.curriculumText,
      schedule: design.scheduleJson ?? undefined,
      feePerPerson: body.feePerPerson,
      participants: body.participants,
    });
    await prisma.trainingDesign.update({
      where: { id: params.id },
      data: { proposalText: text, status: "READY" },
    });
    return NextResponse.json({ proposalText: text });
  }
  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}
