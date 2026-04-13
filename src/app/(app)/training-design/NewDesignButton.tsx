"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDesignButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientNeeds: "",
    targetAudience: "",
    targetGoal: "",
    meetingNotes: "",
  });
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!form.title) return;
    setLoading(true);
    const res = await fetch("/api/training-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) return;
    const { design } = await res.json();
    setOpen(false);
    router.push(`/training-design/${design.id}`);
    router.refresh();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-gradient shine">
        🪄 新規研修設計
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg">
            <h2 className="mb-4 text-lg font-bold">新しい研修設計を開始</h2>
            <div className="space-y-3">
              <div>
                <label className="label">研修タイトル *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 生成AI活用によるDXリスキリング研修"
                />
              </div>
              <div>
                <label className="label">クライアント要望</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.clientNeeds}
                  onChange={(e) => setForm({ ...form, clientNeeds: e.target.value })}
                  placeholder="例: 営業部門の若手30名を対象にAIツールを使いこなせる人材を育成したい"
                />
              </div>
              <div>
                <label className="label">対象受講者</label>
                <input
                  className="input"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="例: 営業部 若手・中堅30名"
                />
              </div>
              <div>
                <label className="label">目標状態</label>
                <input
                  className="input"
                  value={form.targetGoal}
                  onChange={(e) => setForm({ ...form, targetGoal: e.target.value })}
                  placeholder="例: AIを使って提案書作成時間を30%削減できる状態"
                />
              </div>
              <div>
                <label className="label">会議議事録（任意）</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.meetingNotes}
                  onChange={(e) => setForm({ ...form, meetingNotes: e.target.value })}
                  placeholder="クライアントとのヒアリング内容を貼り付け"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>
                キャンセル
              </button>
              <button
                className="btn-gradient"
                onClick={create}
                disabled={loading || !form.title}
              >
                {loading ? "作成中..." : "作成してAI設計を開始"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
