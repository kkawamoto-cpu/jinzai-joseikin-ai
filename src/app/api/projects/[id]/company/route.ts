import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CompanyInput } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const safe = JSON.parse(
    JSON.stringify(project.company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ company: safe });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = CompanyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力エラー", issues: parsed.error.issues }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const data = parsed.data as any;
  if (data.capitalAmount !== undefined && data.capitalAmount !== null) {
    data.capitalAmount = BigInt(data.capitalAmount);
  }
  const company = await prisma.company.update({
    where: { id: project.companyId },
    data,
  });
  const safe = JSON.parse(
    JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ company: safe });
}
