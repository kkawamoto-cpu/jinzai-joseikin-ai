"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName: name, trainingStartDate: start || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "作成に失敗しました");
      return;
    }
    const { project } = await res.json();
    setOpen(false);
    router.push(`/projects/${project.id}`);
    router.refresh();
  };

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        ＋ 新規案件
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md">
            <h2 className="mb-4 text-lg font-bold">新規案件作成</h2>
            <div className="mb-3">
              <label className="label">案件名 *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="2026年度 AI研修"
              />
            </div>
            <div className="mb-3">
              <label className="label">訓練開始予定日</label>
              <input
                className="input"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>
                キャンセル
              </button>
              <button className="btn-primary" disabled={loading || !name} onClick={submit}>
                {loading ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
