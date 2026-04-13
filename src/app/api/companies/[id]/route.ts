import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: any = { ...body };
  if (data.capitalAmount !== undefined) {
    if (data.capitalAmount === null || data.capitalAmount === "") {
      data.capitalAmount = null;
    } else {
      try {
        data.capitalAmount = BigInt(Math.round(Number(data.capitalAmount)));
      } catch {
        delete data.capitalAmount;
      }
    }
  }
  if (data.employeeCount !== undefined) data.employeeCount = Number(data.employeeCount) || 0;
  if (data.branchCount !== undefined) data.branchCount = Number(data.branchCount) || 0;
  for (const k of Object.keys(data)) if (data[k] === "") data[k] = null;
  const company = await prisma.company.update({ where: { id: params.id }, data });
  const safe = JSON.parse(
    JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ company: safe });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // 関連する案件・ユーザーがいる場合は拒否
  const projects = await prisma.project.count({ where: { companyId: params.id } });
  const users = await prisma.user.count({ where: { companyId: params.id } });
  if (projects > 0 || users > 0) {
    return NextResponse.json(
      {
        error: `この企業には案件 ${projects}件・ユーザー ${users}件が紐づいています。先にそれらを削除または他企業へ移してください。`,
      },
      { status: 400 }
    );
  }
  await prisma.company.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
