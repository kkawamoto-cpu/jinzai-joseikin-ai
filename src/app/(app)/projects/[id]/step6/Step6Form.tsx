"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";
import StepAIAssist from "@/components/StepAIAssist";

const FIELDS: [string, string, string][] = [
  ["A. 経営理念・経営方針", "managementPhilosophy", "経営理念"],
  ["A. 経営理念・経営方針", "managementPolicy", "経営方針"],
  ["A. 経営理念・経営方針", "futureBusinessPolicy", "今後の事業展開方針"],
  ["A. 経営理念・経営方針", "focusArea", "強化したい分野"],
  ["A. 経営理念・経営方針", "idealHumanResource", "企業として重視する人材像"],
  ["B. 人材育成の基本方針・目標", "hrBasicPolicy", "人材育成の基本方針"],
  ["B. 人材育成の基本方針・目標", "roleBasedDevelopmentPolicy", "職位別育成の考え方"],
  ["B. 人材育成の基本方針・目標", "trainingPurpose", "教育訓練の目的"],
  ["B. 人材育成の基本方針・目標", "careerSupportPolicy", "キャリア形成支援の考え方"],
  ["B. 人材育成の基本方針・目標", "selfDevelopmentSupportPolicy", "自己啓発支援の考え方"],
  ["C. 昇進昇格・人事考課等", "placementPolicy", "配置方針"],
  ["C. 昇進昇格・人事考課等", "promotionCriteria", "昇進・昇格判断基準"],
  ["C. 昇進昇格・人事考課等", "evaluationCriteria", "人事評価基準"],
  ["C. 昇進昇格・人事考課等", "qualificationReflection", "資格取得の評価反映"],
  ["D. 職務に必要な能力", "executiveSkillRequirements", "幹部社員に求める能力"],
  ["D. 職務に必要な能力", "midlevelSkillRequirements", "一般・中堅社員に求める能力"],
  ["D. 職務に必要な能力", "juniorSkillRequirements", "新入・若手社員に求める能力"],
];

export default function Step6Form({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any;
}) {
  const [form, setForm] = useState<any>(initial ?? {});
  const [draft, setDraft] = useState<string | null>(initial?.generatedDocumentText ?? null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaved(false);
    const payload: any = {};
    for (const [, key] of FIELDS) payload[key] = form[key] ?? "";
    await fetch(`/api/projects/${projectId}/internal-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaved(true);
  };

  const generate = async () => {
    setLoading(true);
    await save();
    const res = await fetch(`/api/projects/${projectId}/internal-plan/generate`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      const { content } = await res.json();
      setDraft(content.contentText);
    }
  };

  const groups = FIELDS.reduce<Record<string, [string, string][]>>((acc, [grp, key, label]) => {
    (acc[grp] ||= []).push([key, label]);
    return acc;
  }, {});

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step6 事業内職業能力開発計画</h2>
        <StepAIAssist
          projectId={projectId}
          stepCode="STEP_6_INTERNAL_PLAN"
          label="事業内職業能力開発計画をAIに作成させる"
          description="会社規模・業種・訓練内容から経営理念〜人材育成方針まで計画書を一式生成します"
        />
        <p className="mt-1 text-sm text-slate-600">
          本項目を入力し「ドラフト生成」を押すと、計画書のドラフトをAIが生成します。生成後、Step9でダウンロード・編集できます。
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([grp, fields]) => (
          <div className="card" key={grp}>
            <h3 className="mb-3 font-semibold">{grp}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {fields.map(([k, l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form[k] ?? ""}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button className="btn-secondary" onClick={save}>
          保存のみ
        </button>
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? "生成中..." : "🪄 AIドラフト生成"}
        </button>
        {saved && <span className="text-sm text-emerald-600">保存しました</span>}
      </div>

      {draft && (
        <div className="card mt-4">
          <h3 className="mb-2 font-semibold">生成されたドラフト</h3>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-4 text-sm">
            {draft}
          </pre>
        </div>
      )}

      <StepFooter
        projectId={projectId}
        stepCode="STEP_6_INTERNAL_PLAN"
        onSaveDraft={save}
        onComplete={save}
      />
    </div>
  );
}
