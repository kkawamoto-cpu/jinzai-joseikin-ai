import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 月単位の簡易ガントチャート（訓練期間ベース）
export default async function GanttPage() {
  const user = (await getCurrentUser())!;
  const where =
    user.role === "CLIENT" && user.companyId
      ? { companyId: user.companyId, isArchived: false }
      : { isArchived: false };
  const projects = await prisma.project.findMany({
    where,
    include: { company: true, trainings: true },
    orderBy: { trainingStartDate: "asc" },
  });

  // 表示範囲：最も早い開始日〜最も遅い終了日。データがなければ今日から12か月
  const today = new Date();
  let minDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let maxDate = new Date(today.getFullYear(), today.getMonth() + 11, 28);
  for (const p of projects) {
    if (p.trainingStartDate && p.trainingStartDate < minDate) minDate = new Date(p.trainingStartDate);
    if (p.trainingEndDate && p.trainingEndDate > maxDate) maxDate = new Date(p.trainingEndDate);
    if (p.planSubmissionDeadline && p.planSubmissionDeadline < minDate)
      minDate = new Date(p.planSubmissionDeadline);
  }

  // 月を配列化
  const months: { label: string; date: Date }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    months.push({
      label: `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      date: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const totalMs = maxDate.getTime() - minDate.getTime();
  const pct = (d: Date) => ((d.getTime() - minDate.getTime()) / totalMs) * 100;

  const todayPct = Math.max(0, Math.min(100, pct(today)));

  return (
    <div className="page">
      <div className="mb-8">
        <div className="section-title mb-1">スケジュール</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">ガントチャート</h1>
        <p className="mt-1 text-sm text-slate-600">
          全案件の訓練期間と計画届提出期限をタイムラインで可視化します。
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        {/* 月ヘッダー */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-64 shrink-0 border-r border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
            案件
          </div>
          <div className="relative flex-1 py-3">
            <div className="flex h-full">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-slate-200 px-2 text-center text-[11px] font-medium text-slate-600"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 各案件の行 */}
        {projects.map((p) => {
          const start = p.trainingStartDate ?? null;
          const end = p.trainingEndDate ?? null;
          const deadline = p.planSubmissionDeadline ?? null;
          return (
            <div key={p.id} className="flex border-b border-slate-100 hover:bg-slate-50">
              <div className="w-64 shrink-0 border-r border-slate-200 px-4 py-4">
                <Link href={`/projects/${p.id}`} className="group block">
                  <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                    {p.projectName}
                  </div>
                  <div className="text-xs text-slate-500">{p.company.companyName}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    進捗 {p.progressPercent}% / 訓練 {p.trainings.length}件
                  </div>
                </Link>
              </div>
              <div className="relative flex-1 py-4">
                {/* 今日 */}
                <div
                  className="absolute top-0 h-full w-px bg-rose-400"
                  style={{ left: `${todayPct}%` }}
                  title="今日"
                />
                {/* 計画届期限マーカー */}
                {deadline && (
                  <div
                    className="absolute top-3 flex -translate-x-1/2 items-center"
                    style={{ left: `${pct(new Date(deadline))}%` }}
                    title={`計画届提出期限: ${new Date(deadline).toLocaleDateString("ja-JP")}`}
                  >
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                      📌 期限
                    </span>
                  </div>
                )}
                {/* 訓練期間バー */}
                {start && end && (
                  <div
                    className="absolute top-10 h-5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm"
                    style={{
                      left: `${pct(new Date(start))}%`,
                      width: `${pct(new Date(end)) - pct(new Date(start))}%`,
                    }}
                    title={`訓練期間: ${new Date(start).toLocaleDateString("ja-JP")}〜${new Date(end).toLocaleDateString("ja-JP")}`}
                  >
                    <div className="flex h-full items-center justify-between px-2 text-[10px] font-medium text-white/90">
                      <span>▶</span>
                      <span>■</span>
                    </div>
                  </div>
                )}
                {(!start || !end) && (
                  <div className="flex h-full items-center text-[11px] text-slate-400">
                    日程未設定
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-500">
            案件がまだありません
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded bg-gradient-to-r from-indigo-500 to-purple-500" />
          訓練期間
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-amber-500" />
          計画届提出期限
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-px bg-rose-400" />
          今日
        </div>
      </div>
    </div>
  );
}
