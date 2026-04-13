import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage() {
  const companies = await prisma.company.findMany({
    include: {
      projects: { select: { id: true, projectName: true, status: true, progressPercent: true, updatedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalProjects = companies.reduce((s, c) => s + c.projects.length, 0);
  const activeCustomers = companies.filter((c) => c.projects.length > 0).length;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <div className="section-title mb-1">顧客管理</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">顧客データベース</h1>
        <p className="mt-1 text-sm text-slate-600">
          過去に入力した企業情報を一覧管理できます。顧客ごとの案件進捗も確認可能です。
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card">
          <div className="text-xs text-slate-500">登録企業数</div>
          <div className="mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            {companies.length}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">アクティブ顧客</div>
          <div className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-3xl font-bold text-transparent">
            {activeCustomers}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">累計案件数</div>
          <div className="mt-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-bold text-transparent">
            {totalProjects}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">今月新規</div>
          <div className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-3xl font-bold text-transparent">
            {companies.filter((c) => {
              const d = new Date(c.createdAt);
              const now = new Date();
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">企業一覧</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr className="text-xs font-medium text-slate-500">
              <th className="px-6 py-3 text-left">企業</th>
              <th className="px-6 py-3 text-left">代表者</th>
              <th className="px-6 py-3 text-left">所在地</th>
              <th className="px-6 py-3 text-right">従業員数</th>
              <th className="px-6 py-3 text-right">資本金</th>
              <th className="px-6 py-3 text-right">案件数</th>
              <th className="px-6 py-3 text-left">最新案件</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {companies.map((c) => {
              const latest = c.projects[0];
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700">
                        {c.companyName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{c.companyName}</div>
                        <div className="text-xs text-slate-500">
                          法人番号: {c.corporateNumber || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{c.representativeName || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {c.headOfficeAddress || "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {c.employeeCount ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {c.capitalAmount ? `¥${Number(c.capitalAmount).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="pill-blue">{c.projects.length}</span>
                  </td>
                  <td className="px-6 py-4">
                    {latest ? (
                      <Link
                        href={`/projects/${latest.id}`}
                        className="group inline-flex items-center gap-2"
                      >
                        <div>
                          <div className="truncate text-xs font-medium text-slate-900 group-hover:text-indigo-600">
                            {latest.projectName}
                          </div>
                          <div className="mt-0.5 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${latest.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">案件なし</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                  顧客企業が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
