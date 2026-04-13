import { prisma } from "@/lib/prisma";
import Step4List from "./Step4List";

export default async function Step4({ params }: { params: { id: string } }) {
  const [trainees, offices] = await Promise.all([
    prisma.trainee.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.office.findMany({ where: { projectId: params.id } }),
  ]);
  return <Step4List projectId={params.id} initial={trainees} offices={offices} />;
}
