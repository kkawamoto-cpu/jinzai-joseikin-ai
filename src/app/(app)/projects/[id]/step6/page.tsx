import { prisma } from "@/lib/prisma";
import Step6Form from "./Step6Form";

export default async function Step6({ params }: { params: { id: string } }) {
  const plan = await prisma.internalCapabilityPlan.findUnique({ where: { projectId: params.id } });
  return <Step6Form projectId={params.id} initial={plan} />;
}
