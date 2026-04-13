"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.com", password: "demo" }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "ログインに失敗しました");
      return;
    }
    router.push("/projects");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 p-6">
      <div className="card w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">
            ✦
          </div>
          <h1 className="text-xl font-bold">人材開発支援助成金申請AI</h1>
          <p className="mt-1 text-sm text-slate-600">申請準備を支援するシステムです</p>
        </div>

        <button
          onClick={login}
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
        >
          {loading ? "ログイン中..." : "🚀 ワンクリックでログイン"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <p className="mt-6 text-xs text-slate-500">
          ※ デモ環境です。クリック一つでログインできます。
        </p>
      </div>
    </main>
  );
}
