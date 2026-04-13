import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/api";
import fs from "node:fs/promises";
import path from "node:path";

// Vercel等のサーバーレス環境では /tmp のみ書き込み可能（ephemeral）。
// 本番ではS3/GCSなどのオブジェクトストレージに差し替えてください。
const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || (process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads"));

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const files = await prisma.uploadedFile.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const requiredDocumentId = (form.get("requiredDocumentId") as string | null) || null;
  const documentType = (form.get("documentType") as string | null) || null;
  if (!file) return NextResponse.json({ error: "fileが必要です" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, params.id);
  await fs.mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}_${file.name.replace(/[^\w.\-一-龥ぁ-んァ-ン]/g, "_")}`;
  const filePath = path.join(dir, safeName);
  await fs.writeFile(filePath, buf);

  const saved = await prisma.uploadedFile.create({
    data: {
      projectId: params.id,
      requiredDocumentId: requiredDocumentId || undefined,
      fileName: file.name,
      filePath: path.relative(process.cwd(), filePath),
      mimeType: file.type || "application/octet-stream",
      fileSize: buf.length,
      uploadedBy: user.id,
      documentType: (documentType as any) ?? undefined,
      uploadStatus: "UPLOADED",
    },
  });

  if (requiredDocumentId) {
    await prisma.requiredDocument.update({
      where: { id: requiredDocumentId },
      data: { status: "SUBMITTED" },
    });
  }
  await logActivity(params.id, user.id, "FILE_UPLOADED", `ファイル: ${file.name}`);
  return NextResponse.json({ file: saved }, { status: 201 });
}
