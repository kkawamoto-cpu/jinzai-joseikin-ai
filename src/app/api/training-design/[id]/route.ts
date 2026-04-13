import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const design = await prisma.trainingDesign.findUnique({
    where: { id: params.id },
    include: { company: true, project: true },
  });
  if (!design) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({ design });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const allowed: any = {};
  for (const k of [
    "title",
    "clientNeeds",
    "meetingNotes",
    "targetAudience",
    "targetGoal",
    "status",
    "curriculumText",
    "scheduleJson",
    "proposalText",
    "messagesJson",
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  const design = await prisma.trainingDesign.update({
    where: { id: params.id },
    data: allowed,
  });
  return NextResponse.json({ design });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.trainingDesign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
