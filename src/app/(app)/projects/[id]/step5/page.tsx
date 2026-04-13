import { prisma } from "@/lib/prisma";
import Step5List from "./Step5List";

export default async function Step5({ params }: { params: { id: string } }) {
  const trainings = await prisma.training.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return <Step5List projectId={params.id} initial={JSON.parse(JSON.stringify(trainings))} />;
}
