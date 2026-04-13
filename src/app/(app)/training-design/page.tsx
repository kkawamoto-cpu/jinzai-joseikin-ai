import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewDesignButton from "./NewDesignButton";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  IN_PROGRESS: "設計中",
  READY: "提案書完成",
  ARCHIVED: "アーカイブ",
};
const STATUS_TONE: Record<string, string> = {
  DRAFT: "pill-gray",
  IN_PROGRESS: "pill-blue",
  READY: "pill-green",
  ARCHIVED: "pill-gray",
};

export default async function TrainingDesignPage() {
  const user = (await getCurrentUser())!;
  const designs = await prisma.trainingDesign.findMany({
    where: user.role === "CLIENT" && user.companyId ? { companyId: user.companyId } : {},
    include: { company: true, project: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-title mb-1">研修開発</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            AI研修設計スタジオ
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            クライアントの会議議事録・ニーズをAIと対話しながら、助成金対象となる研修のカリキュラム・スケジュール・提案書を自動生成します。
          </p>
        </div>
        <NewDesignButton />
      </div>

      {/* 特徴ハイライト */}
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { icon: "💬", title: "対話型ヒアリング", desc: "AIが要件を引き出し、質問を整理" },
          { icon: "📚", title: "カリキュラム自動設計", desc: "助成金要件を満たすセッション構成" },
          { icon: "📄", title: "提案書ワンクリック生成", desc: "クライアント提出用のMarkdown出力" },
        ].map((f) => (
          <div key={f.title} className="card">
            <div className="text-2xl">{f.icon}</div>
            <div className="mt-2 text-sm font-bold text-slate-900">{f.title}</div>
            <div className="text-xs text-slate-600">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* 一覧 */}
      {designs.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-3xl">
            🎨
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            まだ研修設計がありません
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            右上の「新規研修設計」から作成を開始できます。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {designs.map((d) => (
            <Link
              key={d.id}
              href={`/training-design/${d.id}`}
              className="card-hover group fade-in-up flex flex-col"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs text-slate-500">
                    {d.company?.companyName || "—"}
                  </div>
                  <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                    {d.title}
                  </h3>
                </div>
                <span className={STATUS_TONE[d.status] ?? "pill-gray"}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              {d.clientNeeds && (
                <p className="mb-3 line-clamp-2 text-xs text-slate-600">{d.clientNeeds}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {d.curriculumText && <span className="pill-blue">カリキュラム</span>}
                {d.scheduleJson && <span className="pill-blue">スケジュール</span>}
                {d.proposalText && <span className="pill-green">提案書</span>}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 text-right text-xs text-slate-400">
                開く →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
