"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = any;

const ROLES = [
  { v: "ADMIN", l: "管理者" },
  { v: "CLIENT", l: "顧客企業" },
  { v: "SHAROUSHI", l: "社労士" },
  { v: "TRAINING_PROVIDER", l: "研修事業者" },
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.v, r.l]));

const EMPTY: User = {
  name: "",
  email: "",
  password: "",
  role: "CLIENT",
  companyId: "",
  isActive: true,
};

export default function UsersManager({
  initial,
  companies,
  myId,
}: {
  initial: User[];
  companies: { id: string; companyName: string }[];
  myId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initial);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; data: User } | null>(null);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      !query ||
      u.name.includes(query) ||
      u.email.includes(query) ||
      (u.company?.companyName ?? "").includes(query)
  );

  const save = async (data: User) => {
    const isNew = !data.id;
    const url = isNew ? "/api/admin/users" : `/api/admin/users/${data.id}`;
    const body: any = { ...data };
    if (!isNew && !body.password) delete body.password;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "保存に失敗しました");
      return;
    }
    const { user } = await res.json();
    if (isNew) setUsers([user, ...users]);
    else setUsers(users.map((u) => (u.id === user.id ? user : u)));
    setEditor(null);
    setErr(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (id === myId) {
      alert("自分自身は削除できません");
      return;
    }
    if (!confirm("このユーザーを削除しますか？")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "削除に失敗しました");
      return;
    }
    setUsers(users.filter((u) => u.id !== id));
    router.refresh();
  };

  const toggleActive = async (u: User) => {
    await save({ ...u, isActive: !u.isActive });
  };

  return (
    <div className="page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
        <div>
          <div className="section-title mb-1">管理画面</div>
          <h1 className="page-title">ユーザー管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            ユーザーの追加・編集・権限変更・有効/無効化を行えます。
          </p>
        </div>
        <button
          className="btn-gradient shine"
          onClick={() => setEditor({ mode: "create", data: { ...EMPTY } })}
        >
          ＋ 新規ユーザー
        </button>
      </div>

      <div className="mb-4">
        <input
          className="input max-w-md"
          placeholder="🔍 氏名・メール・企業名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {err && <p className="mb-3 text-sm text-rose-600">{err}</p>}

      <div className="card overflow-hidden p-0">
       <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left">ユーザー</th>
              <th className="px-6 py-3 text-left">メール</th>
              <th className="px-6 py-3 text-left">ロール</th>
              <th className="px-6 py-3 text-left">所属企業</th>
              <th className="px-6 py-3 text-left">状態</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {u.name}
                        {u.id === myId && <span className="pill-purple ml-2">あなた</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="pill-blue">{ROLE_LABEL[u.role] ?? u.role}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">{u.company?.companyName ?? "—"}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(u)}
                    className={u.isActive ? "pill-green" : "pill-gray"}
                  >
                    {u.isActive ? "✓ 有効" : "✕ 無効"}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setEditor({ mode: "edit", data: { ...u, password: "" } })}
                    >
                      編集
                    </button>
                    <button
                      className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      onClick={() => remove(u.id)}
                      disabled={u.id === myId}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-500">
                  ユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
       </div>
      </div>

      {editor && (
        <UserDialog
          mode={editor.mode}
          initial={editor.data}
          companies={companies}
          onCancel={() => setEditor(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function UserDialog({
  mode,
  initial,
  companies,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  initial: User;
  companies: { id: string; companyName: string }[];
  onCancel: () => void;
  onSave: (data: User) => void;
}) {
  const [form, setForm] = useState<User>(initial);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md">
        <h2 className="mb-4 text-lg font-bold">
          {mode === "create" ? "新規ユーザーを追加" : "ユーザー情報を編集"}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">氏名 *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">メールアドレス *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              {mode === "create" ? "パスワード *" : "新パスワード（変更する場合のみ）"}
            </label>
            <input
              type="password"
              className="input"
              value={form.password ?? ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">ロール</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">所属企業</label>
            <select
              className="input"
              value={form.companyId ?? ""}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              <option value="">（未所属）</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            有効アカウント
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="btn-gradient"
            disabled={saving || !form.name || !form.email || (mode === "create" && !form.password)}
            onClick={async () => {
              setSaving(true);
              await onSave(form);
              setSaving(false);
            }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
