import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";

/**
 * POST /api/projects/:id/link-company
 * body: { companyId: string }
 *
 * 案件が紐づく企業を切り替える。Step2の「顧客管理から読み込み」で使用。
 * これにより既存の企業レコードを上書きすることなく、別の顧客企業に案件をリンクし直す。
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const companyId: string = body.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyIdは必須です" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "対象企業が存在しません" }, { status: 404 });

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: { companyId },
    include: { company: true },
  });
  await logActivity(
    params.id,
    user.id,
    "PROJECT_RELINKED",
    `案件の対象企業を「${company.companyName}」に変更`
  );
  const safe = JSON.parse(
    JSON.stringify(updated, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return NextResponse.json({ project: safe });
}
