import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export async function DELETE(_: NextRequest, { params }: { params: { fileId: string } }) {
  const file = await prisma.uploadedFile.findUnique({ where: { id: params.fileId } });
  if (!file) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  try {
    await fs.unlink(path.join(process.cwd(), file.filePath));
  } catch {
    /* ignore */
  }
  await prisma.uploadedFile.delete({ where: { id: params.fileId } });
  return NextResponse.json({ ok: true });
}
