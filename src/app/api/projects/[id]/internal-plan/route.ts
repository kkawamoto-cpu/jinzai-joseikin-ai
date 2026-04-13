import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InternalPlanInput } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const plan = await prisma.internalCapabilityPlan.findUnique({
    where: { projectId: params.id },
  });
  return NextResponse.json({ plan });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = InternalPlanInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const plan = await prisma.internalCapabilityPlan.upsert({
    where: { projectId: params.id },
    update: parsed.data as any,
    create: { ...(parsed.data as any), projectId: params.id },
  });
  return NextResponse.json({ plan });
}
