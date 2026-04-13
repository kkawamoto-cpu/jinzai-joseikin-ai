"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "メールアドレスまたはパスワードが正しくありません");
        return;
      }
      router.push("/projects");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-lg font-bold text-white shadow-lg">
            AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI助成くん</h1>
          <p className="mt-1 text-sm text-slate-600">
            人材開発支援助成金 申請プラットフォーム
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">メールアドレス</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@example.com"
            />
          </div>
          <div>
            <label className="label">パスワード</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-gradient w-full py-3 text-base"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[11px] text-slate-400">
          AI助成くん © 2026
        </p>
      </form>
    </main>
  );
}
