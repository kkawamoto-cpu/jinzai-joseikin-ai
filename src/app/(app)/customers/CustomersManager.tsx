"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Company = any;

const EMPTY: Company = {
  companyName: "",
  representativeName: "",
  representativeTitle: "",
  headOfficeAddress: "",
  headOfficePhone: "",
  capitalAmount: "",
  corporateNumber: "",
  employeeCount: "",
  employmentInsuranceOfficeNumber: "",
  industryCode: "",
  branchCount: "",
  laborRepresentativeName: "",
  trainingPromotionDepartment: "",
  trainingPromotionTitle: "",
  trainingPromotionName: "",
};

export default function CustomersManager({ initial }: { initial: Company[] }) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; data: Company } | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = companies.filter(
    (c) =>
      !query ||
      (c.companyName ?? "").includes(query) ||
      (c.representativeName ?? "").includes(query) ||
      (c.headOfficeAddress ?? "").includes(query)
  );

  const totalProjects = companies.reduce((s, c) => s + (c.projects?.length ?? 0), 0);
  const activeCustomers = companies.filter((c) => (c.projects?.length ?? 0) > 0).length;

  const save = async (data: Company) => {
    const isNew = !data.id;
    const url = isNew ? "/api/companies" : `/api/companies/${data.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "保存に失敗しました");
      return;
    }
    const { company } = await res.json();
    if (isNew) setCompanies([{ ...company, projects: [] }, ...companies]);
    else setCompanies(companies.map((c) => (c.id === company.id ? { ...c, ...company } : c)));
    setEditor(null);
    setMsg(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("この顧客を削除しますか？紐づく案件・ユーザーがある場合は削除できません。"))
      return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "削除に失敗しました");
      return;
    }
    setCompanies(companies.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-title mb-1">顧客管理</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">顧客データベース</h1>
          <p className="mt-1 text-sm text-slate-600">
            登録企業情報を新規追加・編集・削除できます。
          </p>
        </div>
        <button className="btn-gradient shine" onClick={() => setEditor({ mode: "create", data: { ...EMPTY } })}>
          ＋ 新規顧客
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "登録企業数", value: companies.length, tone: "from-indigo-600 to-purple-600" },
          { label: "アクティブ顧客", value: activeCustomers, tone: "from-emerald-500 to-teal-500" },
          { label: "累計案件数", value: totalProjects, tone: "from-slate-900 to-slate-700" },
          {
            label: "今月新規",
            value: companies.filter((c) => {
              const d = new Date(c.createdAt);
              const n = new Date();
              return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
            }).length,
            tone: "from-amber-500 to-orange-500",
          },
        ].map((kpi) => (
          <div className="card" key={kpi.label}>
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className={`mt-2 bg-gradient-to-r ${kpi.tone} bg-clip-text text-3xl font-bold text-transparent`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <input
          className="input max-w-md"
          placeholder="🔍 企業名・代表者・住所で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {msg && <p className="mb-3 text-sm text-rose-600">{msg}</p>}

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left">企業</th>
              <th className="px-6 py-3 text-left">代表者</th>
              <th className="px-6 py-3 text-left">所在地</th>
              <th className="px-6 py-3 text-right">従業員</th>
              <th className="px-6 py-3 text-right">資本金</th>
              <th className="px-6 py-3 text-right">案件</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700">
                      {c.companyName?.charAt(0) || "？"}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{c.companyName}</div>
                      <div className="text-xs text-slate-500">法人番号: {c.corporateNumber || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{c.representativeName || "—"}</td>
                <td className="px-6 py-4 text-slate-600">{c.headOfficeAddress || "—"}</td>
                <td className="px-6 py-4 text-right tabular-nums">{c.employeeCount ?? "—"}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {c.capitalAmount ? `¥${Number(c.capitalAmount).toLocaleString()}` : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="pill-blue">{c.projects?.length ?? 0}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                      onClick={() =>
                        setEditor({
                          mode: "edit",
                          data: { ...c, capitalAmount: c.capitalAmount ?? "" },
                        })
                      }
                    >
                      編集
                    </button>
                    <button
                      className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => remove(c.id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500">
                  顧客が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editor && (
        <CompanyDialog
          mode={editor.mode}
          initial={editor.data}
          onCancel={() => setEditor(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function CompanyDialog({
  mode,
  initial,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  initial: Company;
  onCancel: () => void;
  onSave: (data: Company) => void;
}) {
  const [form, setForm] = useState<Company>(initial);
  const [saving, setSaving] = useState(false);

  const F = (label: string, key: string, placeholder?: string, type = "text") => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <h2 className="mb-4 text-lg font-bold">
          {mode === "create" ? "新規顧客を追加" : "顧客情報を編集"}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {F("企業名 *", "companyName")}
          {F("代表者氏名", "representativeName")}
          {F("代表者役職", "representativeTitle", "代表取締役")}
          {F("本社電話番号", "headOfficePhone", "03-1234-5678")}
          <div className="md:col-span-2">{F("本社所在地", "headOfficeAddress")}</div>
          {F("資本金額（円）", "capitalAmount", "50000000")}
          {F("法人番号（13桁）", "corporateNumber")}
          {F("従業員数", "employeeCount", "", "number")}
          {F("雇用保険適用事業所番号（11桁）", "employmentInsuranceOfficeNumber")}
          {F("産業分類", "industryCode")}
          {F("本社以外の事業所数", "branchCount", "", "number")}
          {F("労働者代表氏名", "laborRepresentativeName")}
          {F("職業能力開発推進者 部署", "trainingPromotionDepartment")}
          {F("職業能力開発推進者 役職", "trainingPromotionTitle")}
          {F("職業能力開発推進者 氏名", "trainingPromotionName")}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="btn-gradient"
            disabled={!form.companyName || saving}
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
