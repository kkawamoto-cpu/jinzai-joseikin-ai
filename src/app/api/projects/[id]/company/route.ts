import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_FIELDS = [
  "companyName",
  "representativeName",
  "representativeTitle",
  "headOfficeAddress",
  "headOfficePhone",
  "capitalAmount",
  "corporateNumber",
  "employeeCount",
  "employmentInsuranceOfficeNumber",
  "industryCode",
  "branchCount",
  "laborRepresentativeName",
  "trainingPromotionDepartment",
  "trainingPromotionTitle",
  "trainingPromotionName",
];

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

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  // 許可フィールドのみ抽出（projects/id/createdAtなどを除外）
  const data: any = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in body) data[k] = body[k];
  }

  // 資本金(BigInt)
  if ("capitalAmount" in data) {
    const v = data.capitalAmount;
    if (v === "" || v === null || v === undefined) {
      data.capitalAmount = null;
    } else {
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) {
        try {
          data.capitalAmount = BigInt(Math.round(n));
        } catch {
          data.capitalAmount = null;
        }
      } else {
        data.capitalAmount = null;
      }
    }
  }

  // 数値フィールド
  for (const k of ["employeeCount", "branchCount"]) {
    if (k in data) {
      const v = data[k];
      if (v === "" || v === null || v === undefined) {
        data[k] = null;
      } else {
        const n = Number(v);
        data[k] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
      }
    }
  }

  // 文字列の空欄は null に
  for (const k of Object.keys(data)) {
    if (k === "capitalAmount" || k === "employeeCount" || k === "branchCount") continue;
    if (data[k] === "" || data[k] === undefined) data[k] = null;
  }

  try {
    const company = await prisma.company.update({
      where: { id: project.companyId },
      data,
    });
    const safe = JSON.parse(
      JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    );
    return NextResponse.json({ company: safe });
  } catch (e: any) {
    console.error("project company PATCH error:", e);
    return NextResponse.json(
      { error: "保存に失敗しました: " + (e?.message ?? "unknown") },
      { status: 400 }
    );
  }
}
