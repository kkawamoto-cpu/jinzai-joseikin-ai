import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OfficeInput } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; officeId: string } }
) {
  const body = await req.json();
  const parsed = OfficeInput.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  const office = await prisma.office.update({
    where: { id: params.officeId },
    data: parsed.data as any,
  });
  return NextResponse.json({ office });
}

export async function DELETE(_: NextRequest, { params }: { params: { officeId: string } }) {
  await prisma.office.delete({ where: { id: params.officeId } });
  return NextResponse.json({ ok: true });
}
