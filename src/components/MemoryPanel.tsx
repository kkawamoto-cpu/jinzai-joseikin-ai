"use client";
import { useEffect, useState } from "react";

type Memory = { id: string; scope: string; label: string; dataJson: string; updatedAt: string };

/**
 * フォーム入力をメモリに保存・呼出できるパネル。
 * 使い方：
 *   <MemoryPanel scope="company" currentData={form} onLoad={(data) => setForm(data)} />
 */
export default function MemoryPanel({
  scope,
  currentData,
  onLoad,
  title = "🧠 入力メモリ",
}: {
  scope: string;
  currentData: any;
  onLoad: (data: any) => void;
  title?: string;
}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/memory?scope=${scope}`);
    if (res.ok) {
      const { memories } = await res.json();
      setMemories(memories);
    }
  };
  useEffect(() => {
    load();
  }, [scope]);

  const save = async () => {
    if (!label.trim()) {
      setMsg("ラベル名を入力してください");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, label: label.trim(), data: currentData }),
    });
    setLoading(false);
    if (res.ok) {
      setLabel("");
      setMsg("✓ 保存しました");
      setTimeout(() => setMsg(null), 2000);
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "保存に失敗しました");
    }
  };

  const apply = (m: Memory) => {
    try {
      const data = JSON.parse(m.dataJson);
      onLoad(data);
      setMsg(`「${m.label}」を読み込みました`);
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg("読み込みに失敗しました（データ不正）");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("このメモリを削除しますか？")) return;
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">
            保存済み {memories.length} 件 ・ 過去の入力を再利用できます
          </div>
        </div>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* 保存 */}
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="ラベル名（例: 本社情報 2026）"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button
              className="btn-secondary text-xs"
              disabled={loading || !label.trim()}
              onClick={save}
            >
              💾 現在の内容を記憶
            </button>
          </div>
          {/* 一覧 */}
          {memories.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              まだ保存されたメモリがありません
            </p>
          ) : (
            <div className="space-y-1">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-800">{m.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(m.updatedAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                      onClick={() => apply(m)}
                    >
                      ← 呼出
                    </button>
                    <button
                      className="rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                      onClick={() => remove(m.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {msg && <p className="text-xs text-slate-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}
