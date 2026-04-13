import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/projects");
  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        companyId: true,
        createdAt: true,
        company: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);
  return (
    <UsersManager
      initial={JSON.parse(JSON.stringify(users))}
      companies={companies}
      myId={user.id}
    />
  );
}
