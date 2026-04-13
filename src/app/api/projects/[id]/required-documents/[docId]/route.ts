import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { docId: string } }
) {
  const body = await req.json();
  const doc = await prisma.requiredDocument.update({
    where: { id: params.docId },
    data: {
      status: body.status ?? undefined,
      isRequired: body.isRequired ?? undefined,
      feedbackComment: body.feedbackComment ?? undefined,
    },
  });
  return NextResponse.json({ document: doc });
}
