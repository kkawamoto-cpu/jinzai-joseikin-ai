import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TraineeInput } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { traineeId: string } }
) {
  const body = await req.json();
  const parsed = TraineeInput.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const trainee = await prisma.trainee.update({
    where: { id: params.traineeId },
    data: parsed.data as any,
  });
  return NextResponse.json({ trainee });
}

export async function DELETE(_: NextRequest, { params }: { params: { traineeId: string } }) {
  await prisma.trainee.delete({ where: { id: params.traineeId } });
  return NextResponse.json({ ok: true });
}
