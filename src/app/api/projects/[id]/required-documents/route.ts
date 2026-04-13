import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const documents = await prisma.requiredDocument.findMany({
    where: { projectId: params.id },
    include: { files: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ documents });
}
