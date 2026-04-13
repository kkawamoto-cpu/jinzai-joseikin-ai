import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/memory?scope=company  */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = req.nextUrl.searchParams.get("scope") || undefined;
  const memories = await prisma.userMemory.findMany({
    where: { userId: user.id, ...(scope ? { scope } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ memories });
}

/** POST /api/memory  { scope, label, data } */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.scope || !body.label || body.data === undefined)
    return NextResponse.json({ error: "scope/label/data は必須です" }, { status: 400 });
  // BigInt対応
  const json = JSON.stringify(body.data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const mem = await prisma.userMemory.create({
    data: {
      userId: user.id,
      scope: body.scope,
      label: body.label,
      dataJson: json,
    },
  });
  return NextResponse.json({ memory: mem }, { status: 201 });
}
