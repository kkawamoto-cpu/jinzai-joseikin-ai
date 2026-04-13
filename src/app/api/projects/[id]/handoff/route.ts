import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const handoff = await prisma.handoffRecord.create({
    data: {
      projectId: params.id,
      handedOffBy: user.id,
      handedOffTo: body.handedOffTo ?? null,
      handoffStatus: "REQUESTED",
      handoffNote: body.handoffNote ?? null,
      handedOffAt: new Date(),
    },
  });
  await prisma.project.update({
    where: { id: params.id },
    data: { status: "HANDED_OFF" },
  });
  await logActivity(params.id, user.id, "HANDOFF_REQUESTED", "社労士引継ぎを依頼");
  return NextResponse.json({ handoff }, { status: 201 });
}
