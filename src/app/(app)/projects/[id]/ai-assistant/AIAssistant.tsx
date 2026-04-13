"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; text: string };
type ExtractedFormData = any;

const INITIAL_ASSISTANT_MESSAGE =
  "こんにちは！人材開発支援助成金申請AIアシスタントです🪄\n\n" +
  "この画面では、以下の3つの方法でAIが申請内容を自動入力します：\n\n" +
  "📄 **書類アップロード**: 会社謄本、Excel、HPのPDFなどをアップロードするとAIが内容を読み取ります\n" +
  "🎤 **音声入力**: マイクボタンを押して話すだけで、内容をAIがまとめます\n" +
  "💬 **対話入力**: 下のチャット欄に入力・質問すれば、AIが聞き取りながら入力を進めます\n\n" +
  "まずは、会社名と代表者のお名前を教えてください。または、会社の資料をアップロードしていただいても構いません。";

export default function AIAssistant({
  projectId,
  projectName,
  companyName,
}: {
  projectId: string;
  projectName: string;
  companyName: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedFormData>({});
  const [files, setFiles] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const [applyState, setApplyState] = useState<null | "applying" | "done">(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // 音声認識（Web Speech API）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;
    let finalBuf = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput(finalBuf + interim);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("お使いのブラウザは音声認識に対応していません。Chrome/Safari/Edgeをお試しください。");
      return;
    }
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setInput("");
      rec.start();
      setListening(true);
    }
  };

  const sendMessage = async (opts?: { overrideText?: string }) => {
    const userText = (opts?.overrideText ?? input).trim();
    if (!userText && files.length === 0) return;
    setLoading(true);
    const newMessages: Message[] = [...messages];
    if (userText) newMessages.push({ role: "user", text: userText });
    if (files.length > 0)
      newMessages.push({ role: "user", text: `📎 ${files.map((f) => f.name).join(", ")}` });
    setMessages(newMessages);
    setInput("");

    try {
      // 1. ファイルがあれば抽出
      let mergedData = extracted;
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        if (userText) fd.append("context", userText);
        const res = await fetch(`/api/projects/${projectId}/ai-extract`, { method: "POST", body: fd });
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        mergedData = deepMerge(mergedData, data || {});
        setExtracted(mergedData);
        setFiles([]);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `📄 アップロードされた書類から情報を抽出しました。${summarize(data)}\n\n続けて、他に確認したい項目があれば教えてください。もしくは「入力を反映」ボタンでフォームに適用できます。`,
          },
        ]);
      }

      // 2. チャット抽出（テキスト入力あれば）
      if (userText) {
        const res = await fetch(`/api/projects/${projectId}/ai-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, text: m.text })),
            currentData: mergedData,
          }),
        });
        const { reply, merged, done, error } = await res.json();
        if (error) throw new Error(error);
        setExtracted(merged || mergedData);
        setMessages((m) => [...m, { role: "assistant", text: reply }]);
        if (done) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: "✅ ここまでの情報が揃いました。画面右の「入力をフォームに反映」ボタンを押すとStep2〜6のフォームに自動入力されます。",
            },
          ]);
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `⚠ エラーが発生しました: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!confirm("抽出された内容をフォームに反映します。よろしいですか？")) return;
    setApplyState("applying");
    const res = await fetch(`/api/projects/${projectId}/ai-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: extracted,
        replace: { offices: false, trainees: false, trainings: false },
      }),
    });
    if (res.ok) {
      const { applied } = await res.json();
      setApplyState("done");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `✨ フォームに反映しました！\n${Object.entries(applied)
            .map(([k, v]) => `  • ${labelKey(k)}: ${v}項目`)
            .join("\n")}\n\nStep2〜6の画面を開くと、記入済みの状態になっています。`,
        },
      ]);
      router.refresh();
    } else {
      setApplyState(null);
      alert("反映に失敗しました。");
    }
  };

  return (
    <div>
      <div className="card mb-4 bg-gradient-to-r from-brand-50 to-white">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg text-white">
            🪄
          </div>
          <div>
            <h2 className="text-lg font-bold">AI入力代行アシスタント</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              書類アップロード、音声、対話でAIが申請内容（Step1〜7）を自動入力します
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* チャット画面 */}
        <div className="lg:col-span-2">
          <div className="card h-[600px] overflow-hidden p-0">
            <div ref={chatRef} className="h-[500px] overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                    🤖 考え中...
                  </div>
                </div>
              )}
            </div>

            {/* ファイルプレビュー */}
            {files.length > 0 && (
              <div className="border-t bg-slate-50 px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs shadow-sm"
                    >
                      📄 {f.name}
                      <button
                        className="ml-1 text-slate-400 hover:text-rose-600"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 入力エリア */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    setFiles([...files, ...fs]);
                    e.target.value = "";
                  }}
                />
                <button
                  title="ファイルを添付"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-lg hover:bg-slate-50"
                >
                  📎
                </button>
                <button
                  title="音声入力"
                  onClick={toggleMic}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${
                    listening
                      ? "animate-pulse border-rose-500 bg-rose-500 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  {listening ? "⏺" : "🎤"}
                </button>
                <textarea
                  className="input min-h-[40px] resize-none"
                  rows={1}
                  placeholder={
                    listening
                      ? "話してください..."
                      : "メッセージを入力（例: 当社は製造業で従業員は50名です）"
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  className="btn-primary h-10 shrink-0"
                  disabled={loading || (!input.trim() && files.length === 0)}
                  onClick={() => sendMessage()}
                >
                  送信
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                📎 会社謄本PDF / Excel / 画像など、🎤 で音声入力、💬 で対話。Enterで送信。
              </p>
            </div>
          </div>
        </div>

        {/* サイドパネル：抽出状況 */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-2 font-semibold">🗂 抽出された情報</h3>
            <ExtractSummary data={extracted} />
          </div>
          <div className="card">
            <h3 className="mb-2 font-semibold">✨ フォームへ反映</h3>
            <p className="mb-3 text-xs text-slate-600">
              確認した内容で問題なければ、クリックで各Stepのフォームに自動入力されます。
            </p>
            <button
              className="btn-primary w-full"
              onClick={apply}
              disabled={applyState === "applying" || !hasAnyData(extracted)}
            >
              {applyState === "applying"
                ? "反映中..."
                : applyState === "done"
                ? "✓ 反映済み（再反映）"
                : "入力をフォームに反映"}
            </button>
          </div>
          <div className="card">
            <h3 className="mb-2 font-semibold">💡 ヒント</h3>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• 会社謄本（PDF）から代表者・資本金・所在地を自動抽出</li>
              <li>• 従業員リストExcelをアップすると受講者欄に自動展開</li>
              <li>• 「社員3人がDX研修を受ける予定」など自然文でOK</li>
              <li>• 音声は「です・ます調」でゆっくり話すと精度UP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtractSummary({ data }: { data: any }) {
  const has = (v: any) => v && Object.keys(v).length > 0;
  if (!data || (!has(data.company) && !data.offices?.length && !data.trainees?.length && !data.trainings?.length && !has(data.internalPlan))) {
    return <p className="text-xs text-slate-500">まだ情報がありません。書類を添付するか、会話を始めてください。</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {has(data.company) && (
        <li>
          <span className="pill-blue">会社情報</span>{" "}
          <span className="text-xs text-slate-500">
            {Object.keys(data.company).length}項目 ({data.company.companyName ?? "-"})
          </span>
        </li>
      )}
      {data.offices?.length > 0 && (
        <li>
          <span className="pill-blue">事業所</span>{" "}
          <span className="text-xs text-slate-500">{data.offices.length}件</span>
        </li>
      )}
      {data.trainees?.length > 0 && (
        <li>
          <span className="pill-blue">受講者</span>{" "}
          <span className="text-xs text-slate-500">
            {data.trainees.length}名 ({data.trainees.map((t: any) => t.fullName).filter(Boolean).slice(0, 3).join(", ")})
          </span>
        </li>
      )}
      {data.trainings?.length > 0 && (
        <li>
          <span className="pill-blue">訓練</span>{" "}
          <span className="text-xs text-slate-500">
            {data.trainings.length}件 ({data.trainings.map((t: any) => t.trainingName).filter(Boolean).slice(0, 2).join(", ")})
          </span>
        </li>
      )}
      {has(data.internalPlan) && (
        <li>
          <span className="pill-blue">事業内職業能力開発計画</span>{" "}
          <span className="text-xs text-slate-500">{Object.keys(data.internalPlan).length}項目</span>
        </li>
      )}
      {data.notes && (
        <li className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">📝 {data.notes}</li>
      )}
    </ul>
  );
}

function hasAnyData(data: any): boolean {
  if (!data) return false;
  return (
    !!(data.company && Object.keys(data.company).length) ||
    !!(data.offices?.length) ||
    !!(data.trainees?.length) ||
    !!(data.trainings?.length) ||
    !!(data.internalPlan && Object.keys(data.internalPlan).length)
  );
}

function labelKey(k: string): string {
  const map: Record<string, string> = {
    company: "会社情報",
    offices: "事業所",
    trainees: "受講者",
    trainings: "訓練",
    internalPlan: "事業内職業能力開発計画",
  };
  return map[k] ?? k;
}

function summarize(data: any): string {
  const parts: string[] = [];
  if (data?.company?.companyName) parts.push(`会社名: ${data.company.companyName}`);
  if (data?.offices?.length) parts.push(`事業所 ${data.offices.length}件`);
  if (data?.trainees?.length) parts.push(`受講者 ${data.trainees.length}名`);
  if (data?.trainings?.length) parts.push(`訓練 ${data.trainings.length}件`);
  return parts.length ? ` (${parts.join(" / ")})` : "";
}

function deepMerge(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) out[k] = [...(a[k] || []), ...b[k]];
    else if (typeof b[k] === "object" && b[k] !== null) out[k] = deepMerge(a[k], b[k]);
    else if (b[k] !== undefined && b[k] !== null && b[k] !== "") out[k] = b[k];
  }
  return out;
}
