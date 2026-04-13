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

const STATUS_TONE: Record<string, string> = {
  DRAFT: "pill-gray",
  INPUTTING: "pill-blue",
  WAITING_DOCUMENTS: "pill-amber",
  AI_CHECKED: "pill-purple",
  NEEDS_FIX: "pill-red",
  WAITING_SHAROUSHI: "pill-amber",
  READY_TO_HANDOFF: "pill-green",
  HANDED_OFF: "pill-green",
  REVIEWING: "pill-blue",
  COMPLETED: "pill-green",
};

export default async function ProjectsPage() {
  const user = (await getCurrentUser())!;
  const where =
    user.role === "CLIENT" && user.companyId
      ? { companyId: user.companyId, isArchived: false }
      : { isArchived: false };
  const projects = await prisma.project.findMany({
    where,
    include: { company: true, aiCheckResults: true, requiredDocuments: true },
    orderBy: { updatedAt: "desc" },
  });

  // 集計
  const stats = {
    total: projects.length,
    inputting: projects.filter((p) => p.status === "INPUTTING").length,
    pending: projects.filter((p) => ["WAITING_DOCUMENTS", "WAITING_SHAROUSHI"].includes(p.status)).length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
  };

  return (
    <div className="page">
      {/* Hero */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
        <div>
          <div className="section-title mb-1">ダッシュボード</div>
          <h1 className="page-title">案件一覧</h1>
          <p className="mt-1 text-sm text-slate-600">助成金申請準備の案件を一元管理します。</p>
        </div>
        {(user.role === "ADMIN" || user.role === "CLIENT") && <NewProjectButton />}
      </div>

      {/* KPI */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "案件総数", value: stats.total, tone: "from-slate-900 to-slate-700" },
          { label: "入力中", value: stats.inputting, tone: "from-indigo-600 to-purple-600" },
          { label: "待ち案件", value: stats.pending, tone: "from-amber-500 to-orange-500" },
          { label: "準備完了", value: stats.completed, tone: "from-emerald-500 to-teal-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
            <div
              className={`mt-2 bg-gradient-to-r ${kpi.tone} bg-clip-text text-3xl font-bold tracking-tight text-transparent`}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* プロジェクトカード */}
      {projects.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-3xl">
            📋
          </div>
          <h3 className="text-lg font-semibold text-slate-900">まだ案件がありません</h3>
          <p className="mt-1 text-sm text-slate-600">
            右上の「新規案件」ボタンから申請準備を開始できます。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: any) => {
            const errors = p.aiCheckResults.filter((r: any) => r.severity === "ERROR").length;
            const warnings = p.aiCheckResults.filter((r: any) => r.severity === "WARNING").length;
            const missing = p.requiredDocuments.filter(
              (d: any) => d.isRequired && d.status !== "SUBMITTED" && d.status !== "APPROVED"
            ).length;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card-hover group fade-in-up flex flex-col"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{p.company.companyName}</span>
                    </div>
                    <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                      {p.projectName}
                    </h3>
                  </div>
                  <span className={STATUS_TONE[p.status] ?? "pill-gray"}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>進捗</span>
                    <span className="font-medium text-slate-700">{p.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${p.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  {p.trainingStartDate && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5">
                      📅 {new Date(p.trainingStartDate).toLocaleDateString("ja-JP")}
                    </span>
                  )}
                  {missing > 0 && <span className="pill-amber">書類 {missing}件</span>}
                  {errors > 0 && <span className="pill-red">⚠ {errors}</span>}
                  {warnings > 0 && <span className="pill-amber">注意 {warnings}</span>}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 text-right text-xs text-slate-400">
                  開く →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
