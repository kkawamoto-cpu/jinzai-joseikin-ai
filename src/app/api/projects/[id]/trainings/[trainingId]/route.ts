import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrainingInput } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { trainingId: string } }
) {
  const body = await req.json();
  const parsed = TrainingInput.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data as any;
  if (d.trainingStartDate) d.trainingStartDate = new Date(d.trainingStartDate);
  if (d.trainingEndDate) d.trainingEndDate = new Date(d.trainingEndDate);
  const training = await prisma.training.update({ where: { id: params.trainingId }, data: d });
  return NextResponse.json({ training });
}

export async function DELETE(_: NextRequest, { params }: { params: { trainingId: string } }) {
  await prisma.training.delete({ where: { id: params.trainingId } });
  return NextResponse.json({ ok: true });
}
