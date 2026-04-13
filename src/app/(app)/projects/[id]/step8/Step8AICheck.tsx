"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";

const toneBySev: Record<string, string> = {
  ERROR: "border-rose-300 bg-rose-50",
  WARNING: "border-amber-300 bg-amber-50",
  INFO: "border-slate-300 bg-slate-50",
};
const pillBySev: Record<string, string> = {
  ERROR: "pill-red",
  WARNING: "pill-amber",
  INFO: "pill-gray",
};

export default function Step8AICheck({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any[];
}) {
  const [results, setResults] = useState(initial);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const res = await fetch(`/api/projects/${projectId}/ai-check`, { method: "POST" });
    setRunning(false);
    if (res.ok) {
      const r = await fetch(`/api/projects/${projectId}/ai-check-results`).then((r) => r.json());
      setResults(r.results);
    }
  };

  const errorCount = results.filter((r) => r.severity === "ERROR").length;
  const warnCount = results.filter((r) => r.severity === "WARNING").length;

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Step8 AIチェック結果</h2>
          <p className="mt-1 text-sm text-slate-600">
            入力内容と書類からAIが要件該当性・不足資料・リスクを判定します。
          </p>
        </div>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? "実行中..." : "🤖 AIチェックを実行"}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <span className="pill-red">エラー {errorCount}</span>
        <span className="pill-amber">警告 {warnCount}</span>
        <span className="pill-gray">合計 {results.length}</span>
      </div>

      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.id} className={`rounded-md border p-4 ${toneBySev[r.severity]}`}>
            <div className="flex items-center gap-2">
              <span className={pillBySev[r.severity]}>{r.severity}</span>
              <span className="text-xs text-slate-500">{r.checkType}</span>
            </div>
            <div className="mt-1 font-semibold">{r.title}</div>
            <div className="text-sm text-slate-700">{r.detail}</div>
            {r.relatedStepCode && (
              <div className="mt-1 text-xs text-slate-500">関連: {r.relatedStepCode}</div>
            )}
          </div>
        ))}
        {results.length === 0 && (
          <p className="py-6 text-center text-slate-500">まだチェックが実行されていません。</p>
        )}
      </div>

      <StepFooter projectId={projectId} stepCode="STEP_8_AI_CHECK" />
    </div>
  );
}
