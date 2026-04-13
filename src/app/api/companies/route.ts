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

  const data: any = {};
  for (const k of ALLOWED_FIELDS) {
    if (k in body) data[k] = body[k];
  }

  // 資本金(BigInt)
  if ("capitalAmount" in data) {
    const v = data.capitalAmount;
    if (v === "" || v === null || v === undefined) {
      delete data.capitalAmount;
    } else {
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) {
        try {
          data.capitalAmount = BigInt(Math.round(n));
        } catch {
          delete data.capitalAmount;
        }
      } else {
        delete data.capitalAmount;
      }
    }
  }

  // 数値フィールド
  for (const k of ["employeeCount", "branchCount"]) {
    if (k in data) {
      const v = data[k];
      if (v === "" || v === null || v === undefined) {
        delete data[k];
      } else {
        const n = Number(v);
        data[k] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      }
    }
  }

  // 空文字を除去
  for (const k of Object.keys(data)) {
    if (k === "capitalAmount" || k === "employeeCount" || k === "branchCount") continue;
    if (data[k] === "" || data[k] === undefined) delete data[k];
  }

  try {
    const company = await prisma.company.create({ data });
    const safe = JSON.parse(
      JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    );
    return NextResponse.json({ company: safe }, { status: 201 });
  } catch (e: any) {
    console.error("company POST error:", e);
    return NextResponse.json(
      { error: "登録に失敗しました: " + (e?.message ?? "unknown") },
      { status: 400 }
    );
  }
}
