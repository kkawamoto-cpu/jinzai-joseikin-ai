import { prisma } from "@/lib/prisma";
import Step2Form from "./Step2Form";

export default async function Step2({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!project) return null;
  const company = JSON.parse(
    JSON.stringify(project.company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return <Step2Form projectId={params.id} initial={company} />;
}
