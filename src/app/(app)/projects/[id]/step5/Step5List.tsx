"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";
import { RISK_WORDS } from "@/lib/ai";

const FORMATS = [
  { v: "ONSITE", l: "通学" },
  { v: "LIVE_ONLINE", l: "同時双方向" },
  { v: "E_LEARNING", l: "eラーニング" },
  { v: "CORRESPONDENCE", l: "通信" },
  { v: "SUBSCRIPTION", l: "定額制" },
];

export default function Step5List({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any[];
}) {
  const [items, setItems] = useState<any[]>(initial);

  const add = async () => {
    const res = await fetch(`/api/projects/${projectId}/trainings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainingName: "新規訓練",
        trainingFormat: "LIVE_ONLINE",
        instructionType: "BUSINESS_ORDER",
        trainingType: "OFF_JT",
        totalTrainingHours: 10,
        tuitionFee: 0,
      }),
    });
    if (res.ok) {
      const { training } = await res.json();
      setItems([...items, training]);
    }
  };
  const update = async (id: string, patch: any) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await fetch(`/api/projects/${projectId}/trainings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };
  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/projects/${projectId}/trainings/${id}`, { method: "DELETE" });
    setItems(items.filter((t) => t.id !== id));
  };

  const hasRiskWord = (t: any) =>
    RISK_WORDS.find(
      (w) =>
        (t.trainingName || "").includes(w) || (t.curriculumText || "").includes(w)
    );

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step5 訓練情報</h2>
        <p className="mt-1 text-sm text-slate-600">
          訓練の内容・時間・費用等を入力してください。総訓練時間10時間以上、OFF-JTが必須要件です。
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">訓練 {items.length}件</h3>
        <button className="btn-secondary" onClick={add}>
          ＋ 訓練を追加
        </button>
      </div>

      <div className="space-y-4">
        {items.map((t) => {
          const warning10h = Number(t.totalTrainingHours || 0) > 0 && Number(t.totalTrainingHours) < 10;
          const riskWord = hasRiskWord(t);
          return (
            <div key={t.id} className="card">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="label">研修名 *</label>
                  <input
                    className="input"
                    value={t.trainingName ?? ""}
                    onChange={(e) => update(t.id, { trainingName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">提供事業者</label>
                  <input
                    className="input"
                    value={t.providerName ?? ""}
                    onChange={(e) => update(t.id, { providerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">訓練形式</label>
                  <select
                    className="input"
                    value={t.trainingFormat}
                    onChange={(e) => update(t.id, { trainingFormat: e.target.value })}
                  >
                    {FORMATS.map((f) => (
                      <option key={f.v} value={f.v}>
                        {f.l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">OFF-JT区分</label>
                  <select
                    className="input"
                    value={t.trainingType}
                    onChange={(e) => update(t.id, { trainingType: e.target.value })}
                  >
                    <option value="OFF_JT">OFF-JT</option>
                    <option value="OFF_JT_OJT">OFF-JT + OJT</option>
                  </select>
                </div>
                <div>
                  <label className="label">実施形態</label>
                  <select
                    className="input"
                    value={t.instructionType}
                    onChange={(e) => update(t.id, { instructionType: e.target.value })}
                  >
                    <option value="BUSINESS_ORDER">業務命令</option>
                    <option value="VOLUNTARY">自発的受講</option>
                  </select>
                </div>
                <div>
                  <label className="label">開始日</label>
                  <input
                    className="input"
                    type="date"
                    value={t.trainingStartDate ? String(t.trainingStartDate).slice(0, 10) : ""}
                    onChange={(e) => update(t.id, { trainingStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">終了日</label>
                  <input
                    className="input"
                    type="date"
                    value={t.trainingEndDate ? String(t.trainingEndDate).slice(0, 10) : ""}
                    onChange={(e) => update(t.id, { trainingEndDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">総訓練時間</label>
                  <input
                    className="input"
                    type="number"
                    value={t.totalTrainingHours ?? 0}
                    onChange={(e) => update(t.id, { totalTrainingHours: Number(e.target.value) })}
                  />
                  <p className="help">10時間未満は対象外の可能性</p>
                </div>
                <div>
                  <label className="label">標準学習時間</label>
                  <input
                    className="input"
                    type="number"
                    value={t.standardLearningHours ?? ""}
                    onChange={(e) =>
                      update(t.id, {
                        standardLearningHours: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <p className="help">eラーニング/通信で必須</p>
                </div>
                <div>
                  <label className="label">標準学習期間（日）</label>
                  <input
                    className="input"
                    type="number"
                    value={t.standardLearningPeriod ?? ""}
                    onChange={(e) =>
                      update(t.id, {
                        standardLearningPeriod: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">受講料（円）</label>
                  <input
                    className="input"
                    type="number"
                    value={t.tuitionFee ?? 0}
                    onChange={(e) => update(t.id, { tuitionFee: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">教材費（円）</label>
                  <input
                    className="input"
                    type="number"
                    value={t.materialFee ?? ""}
                    onChange={(e) =>
                      update(t.id, {
                        materialFee: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="label">カリキュラム</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={t.curriculumText ?? ""}
                    onChange={(e) => update(t.id, { curriculumText: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="label">事業展開との関連</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={t.relationToBusinessExpansion ?? ""}
                    onChange={(e) =>
                      update(t.id, { relationToBusinessExpansion: e.target.value })
                    }
                    placeholder="新規事業・業務プロセス改革との具体的な関連（40文字以上推奨）"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="label">DX / GXとの関連</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={t.relationToDxGx ?? ""}
                    onChange={(e) => update(t.id, { relationToDxGx: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="label">将来職務との関連</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={t.relationToFutureRole ?? ""}
                    onChange={(e) => update(t.id, { relationToFutureRole: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-2 text-xs">
                  {warning10h && <span className="pill-amber">⚠ 10時間未満</span>}
                  {riskWord && <span className="pill-red">⚠ 対象外ワード「{riskWord}」</span>}
                </div>
                <button
                  className="text-sm text-rose-600 hover:underline"
                  onClick={() => remove(t.id)}
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">訓練を追加してください</p>
        )}
      </div>

      <StepFooter projectId={projectId} stepCode="STEP_5_TRAINING_INFO" />
    </div>
  );
}
