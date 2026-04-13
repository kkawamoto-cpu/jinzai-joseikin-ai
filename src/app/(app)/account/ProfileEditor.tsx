"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditor({
  initial,
}: {
  initial: { name: string; email: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [mode, setMode] = useState<"view" | "edit" | "password">("view");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (passwordMode: boolean) => {
    setMsg(null);
    if (passwordMode && form.newPassword !== form.confirmPassword) {
      setMsg({ ok: false, text: "新しいパスワードが一致しません" });
      return;
    }
    setLoading(true);
    const body: any = passwordMode
      ? { currentPassword: form.currentPassword, newPassword: form.newPassword }
      : { name: form.name, email: form.email };
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: j.error || "保存に失敗しました" });
      return;
    }
    setMsg({ ok: true, text: passwordMode ? "パスワードを変更しました" : "プロフィールを更新しました" });
    setMode("view");
    if (passwordMode) {
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
    }
    router.refresh();
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">プロフィール編集</h3>
        {mode === "view" && (
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => setMode("edit")}>
              ✎ 編集
            </button>
            <button className="btn-secondary text-xs" onClick={() => setMode("password")}>
              🔒 パスワード変更
            </button>
          </div>
        )}
      </div>

      {mode === "view" && (
        <dl className="text-sm">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">氏名</dt>
            <dd className="font-medium">{form.name}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">メール</dt>
            <dd className="font-medium">{form.email}</dd>
          </div>
        </dl>
      )}

      {mode === "edit" && (
        <div className="space-y-3">
          <div>
            <label className="label">氏名</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">メールアドレス</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-gradient flex-1" disabled={loading} onClick={() => save(false)}>
              {loading ? "保存中..." : "保存"}
            </button>
            <button className="btn-secondary" onClick={() => setMode("view")}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {mode === "password" && (
        <div className="space-y-3">
          <div>
            <label className="label">現在のパスワード</label>
            <input
              type="password"
              className="input"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">新しいパスワード</label>
            <input
              type="password"
              className="input"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">新しいパスワード（確認）</label>
            <input
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-gradient flex-1" disabled={loading} onClick={() => save(true)}>
              {loading ? "変更中..." : "パスワードを変更"}
            </button>
            <button className="btn-secondary" onClick={() => setMode("view")}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
