"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import StepFooter from "@/components/StepFooter";

type DocItem = any;
type FileItem = any;

const VERCEL_LIMIT_MB = 4.4; // Vercel Hobbyの実効リクエストサイズ

function fmtBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export default function Step7Uploads({
  projectId,
  documents,
  files,
}: {
  projectId: string;
  documents: DocItem[];
  files: FileItem[];
}) {
  const router = useRouter();
  // docId別のアップロード進捗 { uploaded: 数, total: 数, current: ファイル名 }
  const [progress, setProgress] = useState<Record<string, { uploaded: number; total: number; current?: string; errors: string[] }>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadOne = async (docId: string, documentType: string, file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("requiredDocumentId", docId);
    fd.append("documentType", documentType);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return j.error || `${file.name} のアップロード失敗 (${res.status})`;
      }
      return null;
    } catch (e: any) {
      return `${file.name}: ${e?.message || "通信エラー"}`;
    }
  };

  const uploadFiles = async (docId: string, documentType: string, fileList: FileList | File[]) => {
    const filesArr = Array.from(fileList);
    if (filesArr.length === 0) return;
    setProgress((p) => ({
      ...p,
      [docId]: { uploaded: 0, total: filesArr.length, current: filesArr[0].name, errors: [] },
    }));
    const errors: string[] = [];
    for (let i = 0; i < filesArr.length; i++) {
      const f = filesArr[i];
      // Vercel上限チェック
      if (f.size > VERCEL_LIMIT_MB * 1024 * 1024) {
        errors.push(`${f.name} (${fmtBytes(f.size)}) はサイズ上限(${VERCEL_LIMIT_MB}MB)を超えています。分割するかZIP圧縮してください。`);
      } else {
        const err = await uploadOne(docId, documentType, f);
        if (err) errors.push(err);
      }
      setProgress((p) => ({
        ...p,
        [docId]: {
          uploaded: i + 1,
          total: filesArr.length,
          current: filesArr[i + 1]?.name,
          errors,
        },
      }));
    }
    setTimeout(() => {
      setProgress((p) => {
        const cp = { ...p };
        // エラーがあれば残す、なければクリア
        if (cp[docId]?.errors.length) return cp;
        delete cp[docId];
        return cp;
      });
    }, 1200);
    router.refresh();
  };

  const removeFile = async (fileId: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    router.refresh();
  };

  const filesByDoc = (docId: string) => files.filter((f: any) => f.requiredDocumentId === docId);

  const totalSize = files.reduce((s, f: any) => s + (f.fileSize || 0), 0);

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step7 必要書類アップロード</h2>
        <p className="mt-1 text-sm text-slate-600">
          PDF / Word / Excel / 画像 / ZIP に対応。
          <br />
          <span className="font-medium text-slate-700">複数ファイルを同時にアップロード可能</span> です。各書類の枠にファイルをドラッグ&ドロップするか、「ファイル追加」から複数選択してください。
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="pill-blue">アップ済み {files.length}件</span>
          <span className="pill-gray">合計 {fmtBytes(totalSize)}</span>
          <span className="pill-amber">⚠ 1ファイル上限 {VERCEL_LIMIT_MB}MB（超過時は分割/ZIP化）</span>
        </div>
      </div>

      <div className="card space-y-3">
        {documents.map((d) => {
          const uploaded = filesByDoc(d.id);
          const prog = progress[d.id];
          const isDragging = dragOver === d.id;
          return (
            <div
              key={d.id}
              className={`rounded-xl border-2 p-3 transition-all ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(d.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                if (e.dataTransfer.files.length) {
                  uploadFiles(d.id, d.documentType, e.dataTransfer.files);
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <span>{d.documentName}</span>
                    {d.isRequired ? (
                      <span className="pill-red">必須</span>
                    ) : (
                      <span className="pill-gray">任意</span>
                    )}
                    {uploaded.length > 0 && (
                      <span className="pill-green">{uploaded.length}件アップ済</span>
                    )}
                  </div>
                  {d.conditionNote && (
                    <div className="mt-0.5 text-xs text-slate-500">{d.conditionNote}</div>
                  )}
                  <div className="mt-1 text-[11px] text-slate-400">
                    📥 ここにファイルをドラッグ&ドロップ、または右のボタンから複数選択
                  </div>
                </div>
                <div>
                  <input
                    ref={(el) => (inputRefs.current[d.id] = el)}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        uploadFiles(d.id, d.documentType, e.target.files);
                        e.target.value = ""; // 同じファイルでも再選択できるように
                      }
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => inputRefs.current[d.id]?.click()}
                    disabled={!!prog && prog.uploaded < prog.total}
                  >
                    {prog && prog.uploaded < prog.total
                      ? `📤 ${prog.uploaded}/${prog.total} アップ中...`
                      : "＋ ファイル追加（複数可）"}
                  </button>
                </div>
              </div>

              {/* プログレスバー */}
              {prog && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{
                        width: `${(prog.uploaded / prog.total) * 100}%`,
                      }}
                    />
                  </div>
                  {prog.current && (
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      📤 {prog.current} を処理中...
                    </p>
                  )}
                  {prog.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-rose-600">
                      {prog.errors.map((e, i) => (
                        <li key={i}>⚠ {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* アップロード済みファイル一覧 */}
              {uploaded.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {uploaded.map((f: any) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-base">📄</span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-700">
                            {f.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {fmtBytes(f.fileSize)} ・ {new Date(f.createdAt).toLocaleString("ja-JP")}
                          </div>
                        </div>
                      </div>
                      <button
                        className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => removeFile(f.id)}
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <StepFooter projectId={projectId} stepCode="STEP_7_UPLOADS" />
    </div>
  );
}
