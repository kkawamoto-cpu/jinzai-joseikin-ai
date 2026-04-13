"use client";
import { useState } from "react";
import StepFooter from "@/components/StepFooter";

const LABELS: Record<string, string> = {
  INTERNAL_PLAN_DRAFT: "事業内職業能力開発計画",
  BUSINESS_EXPANSION_DESCRIPTION: "事業展開等実施計画",
  DX_GX_DESCRIPTION: "DX/GX化説明",
  FUTURE_ROLE_DESCRIPTION: "将来職務との関連",
  REMINDER_MESSAGE: "不足資料催促文",
  HANDOFF_MEMO: "社労士引継ぎメモ",
};

export default function Step9Drafts({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any[];
}) {
  const [contents, setContents] = useState(initial);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<string>(contents[0]?.contentType ?? "");

  const run = async () => {
    setRunning(true);
    const res = await fetch(`/api/projects/${projectId}/generate-drafts`, { method: "POST" });
    setRunning(false);
    if (res.ok) {
      const { contents } = await res.json();
      setContents(contents);
      setTab(contents[0]?.contentType ?? "");
    }
  };

  const download = (c: any) => {
    const blob = new Blob([c.contentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const active = contents.find((c) => c.contentType === tab) ?? contents[0];

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Step9 ドラフト生成結果</h2>
          <p className="mt-1 text-sm text-slate-600">
            入力済み情報から各種説明文・引継ぎメモをAIが生成します。内容をご確認のうえ編集してご利用ください。
          </p>
        </div>
        <button className="btn-primary" onClick={run} disabled={running}>
          {running ? "生成中..." : "🪄 一括ドラフト生成"}
        </button>
      </div>

      {contents.length === 0 ? (
        <p className="py-8 text-center text-slate-500">まだドラフトが生成されていません。</p>
      ) : (
        <div className="card">
          <div className="mb-3 flex flex-wrap gap-2 border-b pb-2">
            {contents.map((c) => (
              <button
                key={c.id}
                onClick={() => setTab(c.contentType)}
                className={`rounded px-3 py-1.5 text-sm ${
                  tab === c.contentType
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {LABELS[c.contentType] ?? c.contentType}
              </button>
            ))}
          </div>
          {active && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{active.title}</h3>
                <button className="btn-secondary" onClick={() => download(active)}>
                  ⬇ ダウンロード(.txt)
                </button>
              </div>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-4 text-sm">
                {active.contentText}
              </pre>
            </>
          )}
        </div>
      )}

      <StepFooter projectId={projectId} stepCode="STEP_9_DRAFTS" />
    </div>
  );
}
