import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { projectId: params.id },
    include: { commenter: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.commentText) return NextResponse.json({ error: "commentTextは必須です" }, { status: 400 });
  const comment = await prisma.comment.create({
    data: {
      projectId: params.id,
      commenterUserId: user.id,
      stepCode: body.stepCode ?? null,
      targetType: body.targetType ?? "PROJECT",
      targetId: body.targetId ?? null,
      commentText: body.commentText,
    },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
