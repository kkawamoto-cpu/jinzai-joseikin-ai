import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/projects");
  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">ユーザー管理</h1>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">氏名</th>
              <th className="px-4 py-2 text-left">メール</th>
              <th className="px-4 py-2 text-left">ロール</th>
              <th className="px-4 py-2 text-left">所属企業</th>
              <th className="px-4 py-2 text-left">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span className="pill-blue">{u.role}</span>
                </td>
                <td className="px-4 py-2">{u.company?.companyName ?? "-"}</td>
                <td className="px-4 py-2">
                  {u.isActive ? (
                    <span className="pill-green">有効</span>
                  ) : (
                    <span className="pill-gray">無効</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
