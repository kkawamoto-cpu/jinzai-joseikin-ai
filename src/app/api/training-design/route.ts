import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designs = await prisma.trainingDesign.findMany({
    where:
      user.role === "CLIENT" && user.companyId
        ? { companyId: user.companyId }
        : {},
    include: { company: true, project: true },
    orderBy: { updatedAt: "desc" },
  });
  const safe = JSON.parse(
    JSON.stringify(designs, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ designs: safe });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const design = await prisma.trainingDesign.create({
    data: {
      title: body.title || "新規研修設計",
      companyId: body.companyId ?? user.companyId ?? null,
      projectId: body.projectId ?? null,
      createdBy: user.id,
      clientNeeds: body.clientNeeds ?? null,
      meetingNotes: body.meetingNotes ?? null,
      targetAudience: body.targetAudience ?? null,
      targetGoal: body.targetGoal ?? null,
      messagesJson: "[]",
    },
  });
  return NextResponse.json({ design }, { status: 201 });
}
