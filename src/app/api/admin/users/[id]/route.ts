import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  for (const k of ["name", "email", "role", "companyId", "isActive"]) {
    if (k in body) data[k] = body[k];
  }
  if (data.email) {
    const dup = await prisma.user.findFirst({
      where: { email: data.email, id: { not: params.id } },
    });
    if (dup)
      return NextResponse.json({ error: "このメールアドレスは既に使われています" }, { status: 400 });
  }
  if (body.password) {
    if (String(body.password).length < 4)
      return NextResponse.json({ error: "パスワードは4文字以上で設定してください" }, { status: 400 });
    data.passwordHash = await hashPassword(body.password);
  }
  if (data.companyId === "") data.companyId = null;
  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, name: true, email: true, role: true, isActive: true, companyId: true, createdAt: true,
      company: { select: { id: true, companyName: true } },
    },
  });
  return NextResponse.json({ user });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.id === params.id)
    return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
