"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理者",
  CLIENT: "顧客企業",
  SHAROUSHI: "社労士",
  TRAINING_PROVIDER: "研修事業者",
};

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
  const navItems = [
    { href: "/projects", label: "案件一覧", show: true },
    { href: "/admin/users", label: "ユーザー管理", show: user.role === "ADMIN" },
  ];
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-white md:flex">
        <div className="p-5">
          <div className="text-sm font-semibold text-brand-700">人材開発支援</div>
          <div className="text-base font-bold leading-tight">助成金申請AI</div>
          <div className="mt-1 text-[10px] text-slate-500">申請準備支援システム</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems
            .filter((n) => n.show)
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname.startsWith(n.href)
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {n.label}
              </Link>
            ))}
        </nav>
        <div className="border-t p-4 text-xs">
          <div className="font-medium">{user.name}</div>
          <div className="text-slate-500">{user.email}</div>
          <div className="mt-1">
            <span className="pill-blue">{ROLE_LABEL[user.role]}</span>
          </div>
          <button
            onClick={logout}
            className="mt-3 text-xs text-slate-500 underline hover:text-slate-800"
          >
            ログアウト
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
