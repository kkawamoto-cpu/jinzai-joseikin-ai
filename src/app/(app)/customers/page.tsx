import { prisma } from "@/lib/prisma";
import CustomersManager from "./CustomersManager";

export default async function CustomersPage() {
  const companies = await prisma.company.findMany({
    include: {
      projects: {
        select: { id: true, projectName: true, status: true, progressPercent: true, updatedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const safe = JSON.parse(
    JSON.stringify(companies, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
  return <CustomersManager initial={safe} />;
}
