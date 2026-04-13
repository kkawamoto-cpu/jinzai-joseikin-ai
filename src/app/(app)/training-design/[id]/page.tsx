import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DesignWorkspace from "./DesignWorkspace";

export default async function TrainingDesignDetail({
  params,
}: {
  params: { id: string };
}) {
  const design = await prisma.trainingDesign.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  if (!design) return notFound();
  return <DesignWorkspace initial={JSON.parse(JSON.stringify(design))} />;
}
