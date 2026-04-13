import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileEditor from "./ProfileEditor";
import CompanyEditor from "./CompanyEditor";

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
  const safeCompany = company
    ? JSON.parse(
        JSON.stringify(company, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
      )
    : null;

  const myProjects = await prisma.project.count({
    where:
      user.role === "CLIENT" && user.companyId
        ? { companyId: user.companyId, isArchived: false }
        : { createdBy: user.id, isArchived: false },
  });
  const totalActivity = await prisma.activityLog.count({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="section-title mb-1">マイページ</div>
        <h1 className="page-title">アカウント情報</h1>
        <p className="mt-1 text-sm text-slate-600">
          プロフィール・所属企業（自社）情報を編集できます。入力は自動保存されます。
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
          {safeCompany && (
            <p className="mt-2 text-xs text-slate-500">
              🏢 所属企業: <span className="font-medium">{safeCompany.companyName}</span>
            </p>
          )}
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

      <div className="mb-6">
        <ProfileEditor initial={{ name: user.name, email: user.email }} />
      </div>

      {safeCompany ? (
        <CompanyEditor initial={safeCompany} />
      ) : (
        <div className="card py-12 text-center text-sm text-slate-500">
          所属企業が未登録です。管理者にお問合せください。
        </div>
      )}
    </div>
  );
}
