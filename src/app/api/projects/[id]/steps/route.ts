import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const steps = await prisma.projectStep.findMany({ where: { projectId: params.id } });
  return NextResponse.json({ steps });
}
