import { prisma } from "@/lib/prisma";
import Step3List from "./Step3List";

export default async function Step3({ params }: { params: { id: string } }) {
  const offices = await prisma.office.findMany({
    where: { projectId: params.id },
    orderBy: { sortOrder: "asc" },
  });
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true },
  });
  return (
    <Step3List
      projectId={params.id}
      initialOffices={offices}
      companyEmployeeCount={project?.company.employeeCount ?? null}
    />
  );
}
