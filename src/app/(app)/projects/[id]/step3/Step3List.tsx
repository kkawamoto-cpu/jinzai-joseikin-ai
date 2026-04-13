"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepFooter from "@/components/StepFooter";

type Office = {
  id: string;
  officeType: "MAIN" | "BRANCH";
  officeName: string;
  officeNumber: string | null;
  employeeCount: number;
  address: string | null;
};

export default function Step3List({
  projectId,
  initialOffices,
  companyEmployeeCount,
}: {
  projectId: string;
  initialOffices: Office[];
  companyEmployeeCount: number | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Office[]>(initialOffices);
  const total = items.reduce((s, o) => s + (Number(o.employeeCount) || 0), 0);
  const mismatch = companyEmployeeCount !== null && total !== companyEmployeeCount;

  const add = async () => {
    const res = await fetch(`/api/projects/${projectId}/offices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officeType: "BRANCH",
        officeName: "新規事業所",
        employeeCount: 0,
        sortOrder: items.length,
      }),
    });
    if (res.ok) {
      const { office } = await res.json();
      setItems([...items, office]);
    }
  };

  const update = async (id: string, patch: Partial<Office>) => {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await fetch(`/api/projects/${projectId}/offices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, employeeCount: patch.employeeCount !== undefined ? Number(patch.employeeCount) : undefined }),
    });
  };

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/projects/${projectId}/offices/${id}`, { method: "DELETE" });
    setItems(items.filter((o) => o.id !== id));
  };

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step3 事業所情報</h2>
        <p className="mt-1 text-sm text-slate-600">
          申請事業所および従たる事業所の情報を入力してください。Step2の労働者数と合致する必要があります。
        </p>
        {mismatch && (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            ⚠ 事業所の労働者数合計（{total}人）が企業の労働者数（{companyEmployeeCount}人）と一致していません。
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            事業所一覧（{items.length}件 / 労働者数合計 {total}人）
          </h3>
          <button onClick={add} className="btn-secondary">
            ＋ 事業所を追加
          </button>
        </div>
        <table className="min-w-full divide-y text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-2 text-left">区分</th>
              <th className="py-2 text-left">事業所名</th>
              <th className="py-2 text-left">雇用保険番号</th>
              <th className="py-2 text-left">労働者数</th>
              <th className="py-2 text-left">住所</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((o) => (
              <tr key={o.id}>
                <td className="py-2 pr-2">
                  <select
                    className="input"
                    value={o.officeType}
                    onChange={(e) => update(o.id, { officeType: e.target.value as any })}
                  >
                    <option value="MAIN">本社</option>
                    <option value="BRANCH">支社</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="input"
                    value={o.officeName}
                    onChange={(e) => update(o.id, { officeName: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="input"
                    value={o.officeNumber ?? ""}
                    onChange={(e) => update(o.id, { officeNumber: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="input w-24"
                    type="number"
                    value={o.employeeCount}
                    onChange={(e) => update(o.id, { employeeCount: Number(e.target.value) as any })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="input"
                    value={o.address ?? ""}
                    onChange={(e) => update(o.id, { address: e.target.value })}
                  />
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => remove(o.id)} className="text-rose-600 hover:underline">
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  事業所が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <StepFooter projectId={projectId} stepCode="STEP_3_OFFICES" onSaveDraft={async () => router.refresh()} />
    </div>
  );
}
