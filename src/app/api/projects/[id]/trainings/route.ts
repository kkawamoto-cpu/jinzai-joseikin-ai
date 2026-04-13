import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrainingInput } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const trainings = await prisma.training.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ trainings });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = TrainingInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data as any;
  if (d.trainingStartDate) d.trainingStartDate = new Date(d.trainingStartDate);
  if (d.trainingEndDate) d.trainingEndDate = new Date(d.trainingEndDate);
  const training = await prisma.training.create({ data: { ...d, projectId: params.id } });
  return NextResponse.json({ training }, { status: 201 });
}
