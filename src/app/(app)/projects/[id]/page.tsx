import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function Dashboard({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      requiredDocuments: true,
      aiCheckResults: true,
      handoffRecords: true,
      steps: true,
    },
  });
  if (!project) return null;

  const missingDocs = project.requiredDocuments.filter(
    (d) => d.isRequired && d.status !== "SUBMITTED" && d.status !== "APPROVED"
  ).length;
  const returnedDocs = project.requiredDocuments.filter((d) => d.status === "RETURNED").length;
  const errors = project.aiCheckResults.filter((r) => r.severity === "ERROR").length;
  const warnings = project.aiCheckResults.filter((r) => r.severity === "WARNING").length;

  const card = (label: string, value: string | number, tone = "slate") => (
    <div className="card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold text-${tone}-700`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {card("ステータス", STATUS_LABEL[project.status] ?? project.status)}
        {card("不足書類", missingDocs, missingDocs > 0 ? "amber" : "emerald")}
        {card("差戻し件数", returnedDocs, returnedDocs > 0 ? "rose" : "slate")}
        {card(
          "計画届提出期限",
          project.planSubmissionDeadline
            ? new Date(project.planSubmissionDeadline).toLocaleDateString("ja-JP")
            : "-"
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">案件サマリー</h2>
          <dl className="text-sm text-slate-700">
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">案件名</dt>
              <dd>{project.projectName}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">企業名</dt>
              <dd>{project.company.companyName}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">訓練期間</dt>
              <dd>
                {project.trainingStartDate
                  ? new Date(project.trainingStartDate).toLocaleDateString("ja-JP")
                  : "-"}{" "}
                〜{" "}
                {project.trainingEndDate
                  ? new Date(project.trainingEndDate).toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">進捗</dt>
              <dd>{project.progressPercent}%</dd>
            </div>
          </dl>
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">AIチェック要約</h2>
          <div className="flex gap-3 text-sm">
            <span className="pill-red">エラー {errors}</span>
            <span className="pill-amber">警告 {warnings}</span>
            <span className="pill-gray">合計 {project.aiCheckResults.length}</span>
          </div>
          <Link
            href={`/projects/${project.id}/step8`}
            className="mt-3 inline-block text-sm text-brand-600 hover:underline"
          >
            AIチェック結果を確認 →
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">次にやること</h2>
        <ul className="space-y-2 text-sm">
          {project.steps
            .filter((s) => s.stepStatus !== "COMPLETED")
            .slice(0, 3)
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{s.stepCode.replace(/_/g, " ")}</span>
                <Link
                  href={`/projects/${project.id}/step${s.stepCode.split("_")[1]}`}
                  className="text-brand-600 hover:underline"
                >
                  開く →
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
