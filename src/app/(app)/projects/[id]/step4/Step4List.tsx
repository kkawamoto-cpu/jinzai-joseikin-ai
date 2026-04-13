"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";
import StepAIAssist from "@/components/StepAIAssist";

type Trainee = any;

export default function Step4List({
  projectId,
  initial,
  offices,
}: {
  projectId: string;
  initial: Trainee[];
  offices: { id: string; officeName: string }[];
}) {
  const [items, setItems] = useState<Trainee[]>(initial);
  const add = async () => {
    const res = await fetch(`/api/projects/${projectId}/trainees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "新規受講者" }),
    });
    if (res.ok) {
      const { trainee } = await res.json();
      setItems([...items, trainee]);
    }
  };
  const update = async (id: string, patch: any) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await fetch(`/api/projects/${projectId}/trainees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };
  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/projects/${projectId}/trainees/${id}`, { method: "DELETE" });
    setItems(items.filter((t) => t.id !== id));
  };
  return (
    <div>
      <StepAIAssist
        projectId={projectId}
        stepCode="STEP_4_TRAINEES"
        label="受講者リストをAIに作成させる"
        description="訓練内容とヒントから受講者の人数・職種・将来職務まで仮生成します"
      />
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step4 受講者情報</h2>
        <p className="mt-1 text-sm text-slate-600">
          訓練を受講する従業員を入力します。将来職務の記載は審査で重視されますので、必ず記入してください。
        </p>
      </div>
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">受講者 {items.length}名</h3>
          <button className="btn-secondary" onClick={add}>
            ＋ 受講者を追加
          </button>
        </div>
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-md border p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div>
                  <label className="label">氏名 *</label>
                  <input
                    className="input"
                    value={t.fullName ?? ""}
                    onChange={(e) => update(t.id, { fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">性別</label>
                  <select
                    className="input"
                    value={t.gender ?? ""}
                    onChange={(e) => update(t.id, { gender: e.target.value })}
                  >
                    <option value="">-</option>
                    <option>男性</option>
                    <option>女性</option>
                    <option>その他</option>
                  </select>
                </div>
                <div>
                  <label className="label">雇用保険被保険者番号</label>
                  <input
                    className="input"
                    value={t.employmentInsuranceNumber ?? ""}
                    onChange={(e) => update(t.id, { employmentInsuranceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">雇用区分</label>
                  <input
                    className="input"
                    value={t.employmentType ?? ""}
                    onChange={(e) => update(t.id, { employmentType: e.target.value })}
                    placeholder="正社員 / 契約 など"
                  />
                </div>
                <div>
                  <label className="label">紐づく事業所</label>
                  <select
                    className="input"
                    value={t.officeId ?? ""}
                    onChange={(e) => update(t.id, { officeId: e.target.value || null })}
                  >
                    <option value="">-</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.officeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">現在の職務</label>
                  <input
                    className="input"
                    value={t.currentJobRole ?? ""}
                    onChange={(e) => update(t.id, { currentJobRole: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">訓練後に従事予定の職務</label>
                  <input
                    className="input"
                    value={t.futureJobRole ?? ""}
                    onChange={(e) => update(t.id, { futureJobRole: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">受講対象訓練名</label>
                  <input
                    className="input"
                    value={t.targetTrainingName ?? ""}
                    onChange={(e) => update(t.id, { targetTrainingName: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!t.isExecutiveDualRole}
                    onChange={(e) => update(t.id, { isExecutiveDualRole: e.target.checked })}
                  />
                  兼務役員
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!t.isOnChildcareLeave}
                    onChange={(e) => update(t.id, { isOnChildcareLeave: e.target.checked })}
                  />
                  育休中
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!t.isRemoteTraining}
                    onChange={(e) => update(t.id, { isRemoteTraining: e.target.checked })}
                  />
                  自宅受講
                </label>
                <button
                  className="ml-auto text-rose-600 hover:underline"
                  onClick={() => remove(t.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">受講者を追加してください</p>
          )}
        </div>
      </div>
      <StepFooter projectId={projectId} stepCode="STEP_4_TRAINEES" />
    </div>
  );
}
