import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { chatForDesign } from "@/lib/trainingDesignAI";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const userText: string = body.text || "";
  if (!userText) return NextResponse.json({ error: "textは必須です" }, { status: 400 });

  const design = await prisma.trainingDesign.findUnique({ where: { id: params.id } });
  if (!design) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const prev = design.messagesJson ? JSON.parse(design.messagesJson) : [];
  const nowMsg = { role: "user", text: userText, createdAt: new Date().toISOString() };
  const msgs = [...prev, nowMsg];

  const reply = await chatForDesign(
    msgs.map((m: any) => ({ role: m.role, text: m.text })),
    {
      title: design.title,
      clientNeeds: design.clientNeeds ?? undefined,
      meetingNotes: design.meetingNotes ?? undefined,
      targetAudience: design.targetAudience ?? undefined,
      targetGoal: design.targetGoal ?? undefined,
    }
  );
  const aiMsg = { role: "assistant", text: reply, createdAt: new Date().toISOString() };
  const newMsgs = [...msgs, aiMsg];
  await prisma.trainingDesign.update({
    where: { id: params.id },
    data: { messagesJson: JSON.stringify(newMsgs) },
  });
  return NextResponse.json({ reply, messages: newMsgs });
}
