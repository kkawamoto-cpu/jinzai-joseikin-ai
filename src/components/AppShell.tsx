"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理者",
  CLIENT: "顧客企業",
  SHAROUSHI: "社労士",
  TRAINING_PROVIDER: "研修事業者",
};

type NavItem = { href: string; label: string; icon: string; show: boolean; badge?: string };

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const mainNav: NavItem[] = [
    { href: "/projects", label: "案件一覧", icon: "📁", show: true },
    { href: "/training-design", label: "研修開発", icon: "🎨", show: true },
    { href: "/customers", label: "顧客管理", icon: "👥", show: true },
    { href: "/gantt", label: "スケジュール", icon: "📅", show: true },
  ];
  const accountNav: NavItem[] = [
    { href: "/account", label: "アカウント", icon: "👤", show: true },
    { href: "/admin/users", label: "ユーザー管理", icon: "⚙️", show: user.role === "ADMIN" },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/projects" && pathname.startsWith(href));

  const NavLink = ({ item }: { item: NavItem }) =>
    !item.show ? null : (
      <Link
        href={item.href}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive(item.href)
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <span className="text-base leading-none">{item.icon}</span>
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded-md bg-rose-500 px-1.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {/* ブランド */}
        <div className="px-5 pt-6 pb-4">
          <Link href="/projects" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md">
              <span className="text-base font-bold">AI</span>
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-slate-900">AI助成くん</div>
              <div className="text-[10px] font-medium text-slate-500">助成金申請プラットフォーム</div>
            </div>
          </Link>
        </div>

        {/* 新規作成ボタン */}
        <div className="px-3 pb-4">
          <Link
            href="/projects?new=1"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
          >
            <span>＋</span> 新規案件を作成
          </Link>
        </div>

        {/* メインナビ */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="section-title px-3 pb-2">メイン</div>
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
          <div className="section-title px-3 pb-2 pt-6">マイページ</div>
          <div className="space-y-1">
            {accountNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </nav>

        {/* ユーザー情報（クリックで /account に遷移） */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2 transition hover:bg-slate-100">
            <Link href="/account" className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="mt-0.5">
                  <span className="pill-blue">{ROLE_LABEL[user.role] ?? user.role}</span>
                </div>
              </div>
            </Link>
            <button
              onClick={logout}
              aria-label="ログアウト"
              className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              title="ログアウト"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
