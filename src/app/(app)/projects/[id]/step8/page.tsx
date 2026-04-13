import { prisma } from "@/lib/prisma";
import Step8AICheck from "./Step8AICheck";

export default async function Step8({ params }: { params: { id: string } }) {
  const results = await prisma.aICheckResult.findMany({
    where: { projectId: params.id },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
  return <Step8AICheck projectId={params.id} initial={results} />;
}
