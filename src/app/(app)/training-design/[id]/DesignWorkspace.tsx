"use client";
import { useState } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; text: string; createdAt?: string };

type Design = {
  id: string;
  title: string;
  clientNeeds: string | null;
  meetingNotes: string | null;
  targetAudience: string | null;
  targetGoal: string | null;
  messagesJson: string | null;
  curriculumText: string | null;
  scheduleJson: string | null;
  proposalText: string | null;
  status: string;
  company: { companyName: string } | null;
};

export default function DesignWorkspace({ initial }: { initial: Design }) {
  const [design, setDesign] = useState(initial);
  const [messages, setMessages] = useState<Message[]>(
    initial.messagesJson ? JSON.parse(initial.messagesJson) : []
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [tab, setTab] = useState<"curriculum" | "schedule" | "proposal">(
    initial.proposalText ? "proposal" : initial.curriculumText ? "curriculum" : "curriculum"
  );

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const newUserMsg: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, newUserMsg]);
    const text = input;
    setInput("");
    try {
      const res = await fetch(`/api/training-design/${design.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const { messages: newMsgs } = await res.json();
        setMessages(newMsgs);
      } else {
        const j = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠ エラー: ${j.error || "送信失敗"}` },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const saveContext = async (patch: Partial<Design>) => {
    const res = await fetch(`/api/training-design/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { design: updated } = await res.json();
      setDesign((d) => ({ ...d, ...updated }));
    }
  };

  const generate = async (kind: "curriculum" | "schedule" | "proposal") => {
    setGenerating(kind);
    try {
      const res = await fetch(`/api/training-design/${design.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (res.ok) {
        const j = await res.json();
        setDesign((d) => ({
          ...d,
          curriculumText: j.curriculumText ?? d.curriculumText,
          scheduleJson: j.scheduleJson ?? d.scheduleJson,
          proposalText: j.proposalText ?? d.proposalText,
        }));
        setTab(kind);
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "生成に失敗しました");
      }
    } finally {
      setGenerating(null);
    }
  };

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("コピーしました");
  };

  const scheduleList = design.scheduleJson
    ? (() => {
        try {
          return JSON.parse(design.scheduleJson);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="text-xs text-slate-500">
          <Link href="/training-design" className="hover:underline">
            研修開発
          </Link>
          <span className="mx-1">/</span>
          {design.company?.companyName || "—"}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{design.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 左: 対話 + コンテキスト */}
        <div className="lg:col-span-2 space-y-4">
          {/* コンテキスト編集 */}
          <div className="card">
            <h3 className="mb-3 text-sm font-bold text-slate-900">📋 設計情報</h3>
            <div className="space-y-2 text-xs">
              <ContextField
                label="クライアント要望"
                value={design.clientNeeds}
                onSave={(v) => saveContext({ clientNeeds: v })}
              />
              <ContextField
                label="対象受講者"
                value={design.targetAudience}
                onSave={(v) => saveContext({ targetAudience: v })}
              />
              <ContextField
                label="目標状態"
                value={design.targetGoal}
                onSave={(v) => saveContext({ targetGoal: v })}
              />
              <ContextField
                label="会議議事録"
                value={design.meetingNotes}
                onSave={(v) => saveContext({ meetingNotes: v })}
                big
              />
            </div>
          </div>

          {/* チャット */}
          <div className="card flex flex-col" style={{ height: "500px" }}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">💬 AIと対話</h3>
            <div className="flex-1 space-y-3 overflow-y-auto rounded-md bg-slate-50 p-3">
              {messages.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p>AIに相談を始めましょう。</p>
                  <p className="mt-1">「営業部員のAI研修を組みたい」など自由に話してください。</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                    AIが考え中...
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <textarea
                className="input text-sm"
                rows={2}
                placeholder="メッセージを入力（例: 営業部の若手30名向けにAI活用研修を作りたい）"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className="btn-gradient shrink-0"
                onClick={send}
                disabled={sending || !input.trim()}
              >
                送信
              </button>
            </div>
          </div>

          {/* 生成ボタン群 */}
          <div className="card">
            <h3 className="mb-3 text-sm font-bold text-slate-900">⚡ AIワンクリック生成</h3>
            <div className="space-y-2">
              <button
                className="btn-gradient w-full justify-between"
                onClick={() => generate("curriculum")}
                disabled={generating !== null}
              >
                <span>📚 カリキュラム生成</span>
                <span>{generating === "curriculum" ? "..." : "→"}</span>
              </button>
              <button
                className="btn-secondary w-full justify-between"
                onClick={() => generate("schedule")}
                disabled={generating !== null || !design.curriculumText}
              >
                <span>📅 スケジュール生成</span>
                <span>{generating === "schedule" ? "..." : "→"}</span>
              </button>
              <button
                className="btn-secondary w-full justify-between"
                onClick={() => generate("proposal")}
                disabled={generating !== null || !design.curriculumText}
              >
                <span>📄 提案書生成</span>
                <span>{generating === "proposal" ? "..." : "→"}</span>
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              ※ カリキュラム→スケジュール→提案書の順に生成します
            </p>
          </div>
        </div>

        {/* 右: 生成結果タブ */}
        <div className="lg:col-span-3">
          <div className="card p-0">
            <div className="flex border-b border-slate-200">
              {(
                [
                  { k: "curriculum", l: "カリキュラム", has: !!design.curriculumText },
                  { k: "schedule", l: "スケジュール", has: !!design.scheduleJson },
                  { k: "proposal", l: "提案書", has: !!design.proposalText },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`relative flex-1 px-4 py-3 text-sm font-medium transition ${
                    tab === t.k
                      ? "text-indigo-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.l}
                  {t.has && <span className="ml-1 text-emerald-500">●</span>}
                  {tab === t.k && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-indigo-600 to-purple-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "curriculum" && (
                <ResultView
                  text={design.curriculumText}
                  placeholder="まだカリキュラムが生成されていません。左の「📚 カリキュラム生成」を押してください。"
                  filename={`${design.title}_カリキュラム.md`}
                  onDownload={download}
                  onCopy={copyToClipboard}
                />
              )}
              {tab === "schedule" && (
                <>
                  {scheduleList && Array.isArray(scheduleList) ? (
                    <div className="space-y-2">
                      {scheduleList.map((s: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                            {s.session}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{s.title}</div>
                            <div className="text-xs text-slate-600">
                              {s.date} {s.start}〜{s.end} / {s.format}
                            </div>
                            {s.notes && (
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {s.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 text-right">
                        <button
                          className="btn-secondary text-xs"
                          onClick={() => copyToClipboard(design.scheduleJson || "")}
                        >
                          📋 JSONコピー
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ResultView
                      text={design.scheduleJson}
                      placeholder="まだスケジュールが生成されていません。カリキュラム生成後に「📅 スケジュール生成」を押してください。"
                      filename={`${design.title}_スケジュール.json`}
                      onDownload={download}
                      onCopy={copyToClipboard}
                    />
                  )}
                </>
              )}
              {tab === "proposal" && (
                <ResultView
                  text={design.proposalText}
                  placeholder="まだ提案書が生成されていません。「📄 提案書生成」で作成できます。"
                  filename={`${design.title}_提案書.md`}
                  onDownload={download}
                  onCopy={copyToClipboard}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextField({
  label,
  value,
  onSave,
  big,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  big?: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value || "");
  if (!edit) {
    return (
      <div
        className="group cursor-pointer rounded-md border border-transparent p-2 transition hover:border-slate-200 hover:bg-slate-50"
        onClick={() => setEdit(true)}
      >
        <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
        <div className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">
          {value || <span className="italic text-slate-400">（クリックして入力）</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="p-2">
      <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
      <textarea
        className="input mt-1 text-xs"
        rows={big ? 4 : 2}
        value={v}
        onChange={(e) => setV(e.target.value)}
        autoFocus
      />
      <div className="mt-1 flex gap-1">
        <button
          className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] text-white"
          onClick={() => {
            onSave(v);
            setEdit(false);
          }}
        >
          保存
        </button>
        <button
          className="rounded bg-slate-200 px-2 py-0.5 text-[10px]"
          onClick={() => {
            setV(value || "");
            setEdit(false);
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

function ResultView({
  text,
  placeholder,
  filename,
  onDownload,
  onCopy,
}: {
  text: string | null;
  placeholder: string;
  filename: string;
  onDownload: (f: string, c: string) => void;
  onCopy: (c: string) => void;
}) {
  if (!text) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
          ✨
        </div>
        {placeholder}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button className="btn-secondary text-xs" onClick={() => onCopy(text)}>
          📋 コピー
        </button>
        <button
          className="btn-secondary text-xs"
          onClick={() => onDownload(filename, text)}
        >
          ⬇ ダウンロード
        </button>
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800">
        {text}
      </pre>
    </div>
  );
}
