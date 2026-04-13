import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      companyId: true,
      createdAt: true,
      company: { select: { id: true, companyName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body.name || !body.email || !body.password)
    return NextResponse.json({ error: "氏名・メール・パスワードは必須です" }, { status: 400 });
  const dup = await prisma.user.findUnique({ where: { email: body.email } });
  if (dup) return NextResponse.json({ error: "このメールアドレスは既に使われています" }, { status: 400 });
  const created = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: body.role ?? "CLIENT",
      companyId: body.companyId || null,
      isActive: body.isActive ?? true,
    },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, companyId: true, createdAt: true,
      company: { select: { id: true, companyName: true } },
    },
  });
  return NextResponse.json({ user: created }, { status: 201 });
}
