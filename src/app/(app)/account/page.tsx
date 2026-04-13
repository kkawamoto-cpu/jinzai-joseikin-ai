import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理者",
  CLIENT: "顧客企業",
  SHAROUSHI: "社労士",
  TRAINING_PROVIDER: "研修事業者",
};

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const company = user.companyId
    ? await prisma.company.findUnique({ where: { id: user.companyId } })
    : null;

  const myProjects = await prisma.project.count({
    where:
      user.role === "CLIENT" && user.companyId
        ? { companyId: user.companyId, isArchived: false }
        : { createdBy: user.id, isArchived: false },
  });
  const totalActivity = await prisma.activityLog.count({ where: { userId: user.id } });

  const info = (label: string, value: string | null | undefined) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <div className="section-title mb-1">マイページ</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">アカウント情報</h1>
        <p className="mt-1 text-sm text-slate-600">
          プロフィール・所属企業・操作履歴を確認できます。
        </p>
      </div>

      {/* プロフィールカード */}
      <div className="card mb-6 overflow-hidden p-0">
        <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="relative px-8 pb-6">
          <div className="-mt-10 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-600 to-purple-600 text-3xl font-bold text-white shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <span className="pill-purple">{ROLE_LABEL[user.role] ?? user.role}</span>
            {user.isActive && <span className="pill-green">アクティブ</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
        </div>
      </div>

      {/* 統計 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="card">
          <div className="text-xs text-slate-500">担当案件数</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{myProjects}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">操作履歴</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{totalActivity}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">登録日</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {new Date(user.createdAt).toLocaleDateString("ja-JP")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* プロフィール詳細 */}
        <div className="card">
          <h3 className="mb-2 text-sm font-bold text-slate-900">プロフィール</h3>
          <dl>
            {info("氏名", user.name)}
            {info("メール", user.email)}
            {info("ロール", ROLE_LABEL[user.role] ?? user.role)}
            {info("ユーザーID", user.id)}
            {info("ステータス", user.isActive ? "有効" : "無効")}
          </dl>
        </div>

        {/* 所属企業 */}
        <div className="card">
          <h3 className="mb-2 text-sm font-bold text-slate-900">所属企業</h3>
          {company ? (
            <dl>
              {info("企業名", company.companyName)}
              {info("代表者", company.representativeName)}
              {info("本社所在地", company.headOfficeAddress)}
              {info("法人番号", company.corporateNumber)}
              {info("従業員数", company.employeeCount ? String(company.employeeCount) : null)}
              {info(
                "資本金",
                company.capitalAmount ? `¥${Number(company.capitalAmount).toLocaleString()}` : null
              )}
            </dl>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">所属企業は未登録です</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        💡 プロフィール編集機能は今後のアップデートで追加予定です。現在は Admin 経由で管理者に変更依頼をしてください。
      </div>
    </div>
  );
}
