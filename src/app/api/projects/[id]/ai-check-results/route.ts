import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const results = await prisma.aICheckResult.findMany({
    where: { projectId: params.id },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ results });
}
