"use client";
import { useState } from "react";

/**
 * 職業訓練実施計画届のドラフト生成ボタン + プレビュー + ダウンロード
 */
export default function PlanNotificationButton({
  projectId,
}: {
  projectId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan-notification`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `生成失敗 (HTTP ${res.status})`);
        return;
      }
      const { markdown } = await res.json();
      setMarkdown(markdown);
      setShowPreview(true);
    } catch (e: any) {
      setError(e?.message || "通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `職業訓練実施計画届ドラフト.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    alert("クリップボードにコピーしました");
  };

  return (
    <div>
      <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-lg text-white shadow-md">
            📋
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-800">職業訓練実施計画届を自動作成</div>
            <div className="text-xs text-slate-600">
              入力済みの企業情報・訓練情報・受講者・計画内容から、労働局提出用のドラフトをAIが生成します
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-50"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    生成中（30秒〜1分）...
                  </>
                ) : (
                  "📋 計画届ドラフトを生成"
                )}
              </button>
              {markdown && (
                <>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? "プレビューを閉じる" : "📄 プレビュー"}
                  </button>
                  <button className="btn-secondary text-xs" onClick={download}>
                    ⬇ ダウンロード(.md)
                  </button>
                  <button className="btn-secondary text-xs" onClick={copy}>
                    📋 コピー
                  </button>
                </>
              )}
            </div>
            {error && (
              <p className="mt-2 text-sm text-rose-600">{error}</p>
            )}
          </div>
        </div>
      </div>

      {showPreview && markdown && (
        <div className="mt-3 card max-h-[70vh] overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">📋 計画届ドラフト（プレビュー）</h3>
            <span className="pill-amber">AIドラフト ・ 提出前に必ず確認してください</span>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800">
            {markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
