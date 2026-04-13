"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type StepCode =
  | "STEP_2_COMPANY_INFO"
  | "STEP_3_OFFICES"
  | "STEP_4_TRAINEES"
  | "STEP_5_TRAINING_INFO"
  | "STEP_6_INTERNAL_PLAN";

export default function StepAIAssist({
  projectId,
  stepCode,
  label = "このステップをAIに任せる",
  description = "既存の入力情報を元に、AIが仮説を立てて残りを自動入力します",
}: {
  projectId: string;
  stepCode: StepCode;
  label?: string;
  description?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-fill-step/${stepCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint, apply: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setResult({ ok: false, text: j.error || "AIによる入力に失敗しました" });
        return;
      }
      const j = await res.json();
      const applied = j.applied || {};
      const summary = Object.entries(applied)
        .map(([k, v]) => `${k}: ${v}項目`)
        .join(" / ");
      setResult({
        ok: true,
        text: summary
          ? `AIが入力しました（${summary}）。ページをリロードして確認してください。`
          : "AIが回答しましたが、反映できる項目がありませんでした。ヒントを追加してお試しください。",
      });
      router.refresh();
    } catch (e: any) {
      setResult({ ok: false, text: e?.message || "エラーが発生しました" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-lg text-white shadow-md">
          🪄
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-800">{label}</div>
              <div className="text-xs text-slate-600">{description}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                onClick={() => setShowHint((s) => !s)}
              >
                {showHint ? "ヒントを閉じる" : "＋ ヒントを追加"}
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                onClick={run}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    AI 生成中...
                  </>
                ) : (
                  "🪄 AIに任せる"
                )}
              </button>
            </div>
          </div>
          {showHint && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                AIへのヒント（任意）
              </label>
              <textarea
                className="input text-sm"
                rows={2}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例: 社員5名がDX研修を受ける予定。受講者は営業部と事務部の中堅。"
              />
            </div>
          )}
          {result && (
            <div
              className={`mt-3 rounded-md px-3 py-2 text-sm ${
                result.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {result.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
