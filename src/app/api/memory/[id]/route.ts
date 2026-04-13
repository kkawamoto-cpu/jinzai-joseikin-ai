import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await prisma.userMemory.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const data: any = {};
  if (body.label) data.label = body.label;
  if (body.data !== undefined)
    data.dataJson = JSON.stringify(body.data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const mem = await prisma.userMemory.update({ where: { id: params.id }, data });
  return NextResponse.json({ memory: mem });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.userMemory.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  await prisma.userMemory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
