import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewProjectButton from "./NewProjectButton";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "未着手",
  INPUTTING: "入力中",
  WAITING_DOCUMENTS: "必要書類待ち",
  AI_CHECKED: "AIチェック済",
  NEEDS_FIX: "修正依頼中",
  WAITING_SHAROUSHI: "社労士確認待ち",
  READY_TO_HANDOFF: "引継ぎ準備完了",
  HANDED_OFF: "引継ぎ済み",
  REVIEWING: "レビュー中",
  COMPLETED: "準備完了",
};

export default async function ProjectsPage() {
  const user = (await getCurrentUser())!;
  const where =
    user.role === "CLIENT" && user.companyId
      ? { companyId: user.companyId, isArchived: false }
      : { isArchived: false };
  const projects = await prisma.project.findMany({
    where,
    include: { company: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">案件一覧</h1>
          <p className="text-sm text-slate-600">助成金申請準備の案件を管理します。</p>
        </div>
        {(user.role === "ADMIN" || user.role === "CLIENT") && <NewProjectButton />}
      </div>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">案件名</th>
              <th className="px-4 py-2 text-left">企業</th>
              <th className="px-4 py-2 text-left">コース</th>
              <th className="px-4 py-2 text-left">開始予定日</th>
              <th className="px-4 py-2 text-left">ステータス</th>
              <th className="px-4 py-2 text-left">進捗</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.projectName}</td>
                <td className="px-4 py-3">{p.company.companyName}</td>
                <td className="px-4 py-3">
                  <span className="pill-blue">
                    {p.subsidyCourse === "JIGYO_TENKAI_RESKILLING"
                      ? "事業展開等リスキリング支援"
                      : p.subsidyCourse}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.trainingStartDate
                    ? new Date(p.trainingStartDate).toLocaleDateString("ja-JP")
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className="pill-gray">{STATUS_LABEL[p.status] ?? p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{p.progressPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/projects/${p.id}`} className="text-brand-600 hover:underline">
                    開く →
                  </Link>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  案件がまだありません。新規作成してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
