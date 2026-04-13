"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = { email: string; password: string; label: string; tone: string };

const ACCOUNTS: Account[] = [
  {
    email: "info@hucha.co.jp",
    password: "Huchaholdings0104",
    label: "メインアカウントでログイン",
    tone: "from-indigo-600 to-purple-600",
  },
  {
    email: "info@aijoseikun.com",
    password: "aijoseikun",
    label: "ゲストアカウントでログイン",
    tone: "from-slate-700 to-slate-900",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"quick" | "manual">("quick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async (account: { email: string; password: string }) => {
    setLoading(account.email);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
    setLoading(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "ログインに失敗しました");
      return;
    }
    router.push("/projects");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6">
      <div className="card w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-lg font-bold text-white shadow-lg">
            AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI助成くん</h1>
          <p className="mt-1 text-sm text-slate-600">
            人材開発支援助成金 申請プラットフォーム
          </p>
        </div>

        {mode === "quick" ? (
          <div className="space-y-2">
            {ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => login({ email: a.email, password: a.password })}
                disabled={loading !== null}
                className={`w-full rounded-xl bg-gradient-to-r ${a.tone} px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50`}
              >
                {loading === a.email ? "ログイン中..." : a.label}
              </button>
            ))}
            <button
              onClick={() => setMode("manual")}
              className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700"
            >
              別のアカウントでログインする →
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login({ email, password });
            }}
            className="space-y-3"
          >
            <div>
              <label className="label">メールアドレス</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">パスワード</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading !== null}
              className="btn-gradient w-full py-2.5"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
            <button
              type="button"
              onClick={() => setMode("quick")}
              className="w-full text-xs text-slate-500 hover:text-slate-700"
            >
              ← ワンクリックログインに戻る
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}

        <p className="mt-6 text-center text-[11px] text-slate-400">
          AIが申請準備・研修設計を支援します
        </p>
      </div>
    </main>
  );
}
