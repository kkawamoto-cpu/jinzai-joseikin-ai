import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { handoffId: string } }
) {
  const body = await req.json();
  const record = await prisma.handoffRecord.update({
    where: { id: params.handoffId },
    data: {
      handoffStatus: body.handoffStatus ?? undefined,
      handoffNote: body.handoffNote ?? undefined,
      reviewedAt: body.handoffStatus === "CONFIRMED" ? new Date() : undefined,
    },
  });
  return NextResponse.json({ record });
}
