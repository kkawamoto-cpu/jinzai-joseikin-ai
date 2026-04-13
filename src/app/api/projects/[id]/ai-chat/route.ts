import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { chatExtract, type ExtractedFormData } from "@/lib/gemini";

export const maxDuration = 60;

/**
 * POST /api/projects/:id/ai-chat
 * body: { messages: [{role, text}], currentData: ExtractedFormData }
 * resp: { reply, merged, done }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const messages = body.messages ?? [];
  const currentData: ExtractedFormData = body.currentData ?? {};
  try {
    const result = await chatExtract(messages, currentData);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
