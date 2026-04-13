import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { passwordHash, ...safe } = user;
  return NextResponse.json({ user: safe });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const update: any = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim()) {
    // 他ユーザーと重複しないか確認
    const dup = await prisma.user.findFirst({
      where: { email: body.email.trim(), id: { not: user.id } },
    });
    if (dup) return NextResponse.json({ error: "このメールアドレスは既に使われています" }, { status: 400 });
    update.email = body.email.trim();
  }

  // パスワード変更（現在のパスワードを要求）
  if (body.newPassword) {
    if (!body.currentPassword)
      return NextResponse.json({ error: "現在のパスワードを入力してください" }, { status: 400 });
    const ok = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!ok)
      return NextResponse.json({ error: "現在のパスワードが一致しません" }, { status: 400 });
    if (String(body.newPassword).length < 4)
      return NextResponse.json({ error: "新しいパスワードは4文字以上で設定してください" }, { status: 400 });
    update.passwordHash = await hashPassword(body.newPassword);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: update });
  const { passwordHash: _p, ...safe } = updated;
  return NextResponse.json({ user: safe });
}
