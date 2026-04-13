import { prisma } from "@/lib/prisma";
import Step9Drafts from "./Step9Drafts";

export default async function Step9({ params }: { params: { id: string } }) {
  const contents = await prisma.aIGeneratedContent.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return <Step9Drafts projectId={params.id} initial={contents} />;
}
