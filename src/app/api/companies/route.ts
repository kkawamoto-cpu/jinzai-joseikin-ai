import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companies = await prisma.company.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });
  const safe = JSON.parse(
    JSON.stringify(companies, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ companies: safe });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.companyName)
    return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
  const data: any = { ...body };
  if (data.capitalAmount !== undefined && data.capitalAmount !== null && data.capitalAmount !== "") {
    try {
      data.capitalAmount = BigInt(Math.round(Number(data.capitalAmount)));
    } catch {
      delete data.capitalAmount;
    }
  } else {
    delete data.capitalAmount;
  }
  if (data.employeeCount !== undefined) data.employeeCount = Number(data.employeeCount) || 0;
  if (data.branchCount !== undefined) data.branchCount = Number(data.branchCount) || 0;
  // 空文字は除去
  for (const k of Object.keys(data)) if (data[k] === "") delete data[k];
  const company = await prisma.company.create({ data });
  const safe = JSON.parse(
    JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ company: safe }, { status: 201 });
}
