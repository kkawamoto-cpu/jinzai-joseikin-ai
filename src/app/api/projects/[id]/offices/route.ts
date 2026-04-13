import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OfficeInput } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const offices = await prisma.office.findMany({
    where: { projectId: params.id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ offices });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = OfficeInput.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const office = await prisma.office.create({ data: { ...parsed.data, projectId: params.id } });
  return NextResponse.json({ office }, { status: 201 });
}
