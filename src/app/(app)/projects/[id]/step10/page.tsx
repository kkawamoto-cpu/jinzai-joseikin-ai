import { prisma } from "@/lib/prisma";
import Step10Handoff from "./Step10Handoff";

export default async function Step10({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      offices: true,
      trainees: true,
      trainings: true,
      requiredDocuments: true,
      uploadedFiles: true,
      aiCheckResults: true,
      handoffRecords: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;
  const safe = JSON.parse(
    JSON.stringify(project, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return <Step10Handoff projectId={params.id} project={safe} />;
}
