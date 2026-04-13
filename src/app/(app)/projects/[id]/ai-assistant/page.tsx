import AIAssistant from "./AIAssistant";
import { prisma } from "@/lib/prisma";

export default async function AIAssistantPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  return (
    <AIAssistant
      projectId={params.id}
      projectName={project?.projectName ?? ""}
      companyName={project?.company.companyName ?? ""}
    />
  );
}
