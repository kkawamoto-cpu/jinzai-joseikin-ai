"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("client@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold">人材開発支援助成金申請AI</h1>
        <p className="mb-6 text-sm text-slate-600">
          申請準備を支援するシステムです。ログインしてください。
        </p>
        <div className="mb-4">
          <label className="label">メールアドレス</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="label">パスワード</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </button>
        <div className="mt-6 border-t pt-4 text-xs text-slate-500">
          <p className="font-medium">デモアカウント（パスワードは全て「password」）</p>
          <ul className="mt-2 space-y-0.5">
            <li>admin@example.com（管理者）</li>
            <li>client@example.com（顧客企業）</li>
            <li>sharoushi@example.com（社労士）</li>
            <li>provider@example.com（研修事業者）</li>
          </ul>
        </div>
      </form>
    </main>
  );
}
