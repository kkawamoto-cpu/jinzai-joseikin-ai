import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TraineeInput } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const trainees = await prisma.trainee.findMany({
    where: { projectId: params.id },
    include: { office: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ trainees });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = TraineeInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const trainee = await prisma.trainee.create({
    data: { ...parsed.data, projectId: params.id } as any,
  });
  return NextResponse.json({ trainee }, { status: 201 });
}
