"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import StepFooter from "@/components/StepFooter";

export default function Step7Uploads({
  projectId,
  documents,
  files,
}: {
  projectId: string;
  documents: any[];
  files: any[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = async (docId: string, documentType: string, file: File) => {
    setUploading(docId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("requiredDocumentId", docId);
    fd.append("documentType", documentType);
    await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
    setUploading(null);
    router.refresh();
  };

  const removeFile = async (fileId: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    router.refresh();
  };

  const filesByDoc = (docId: string) => files.filter((f: any) => f.requiredDocumentId === docId);

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step7 必要書類アップロード</h2>
        <p className="mt-1 text-sm text-slate-600">
          PDF / Word / Excel / 画像 / ZIP に対応。必須書類は全て提出してください。
        </p>
      </div>

      <div className="card space-y-4">
        {documents.map((d) => {
          const uploaded = filesByDoc(d.id);
          return (
            <div key={d.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {d.documentName}{" "}
                    {d.isRequired ? (
                      <span className="pill-red ml-1">必須</span>
                    ) : (
                      <span className="pill-gray ml-1">任意</span>
                    )}
                  </div>
                  {d.conditionNote && <div className="text-xs text-slate-500">{d.conditionNote}</div>}
                </div>
                <div>
                  <input
                    ref={(el) => (inputRefs.current[d.id] = el)}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(d.id, d.documentType, f);
                    }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => inputRefs.current[d.id]?.click()}
                    disabled={uploading === d.id}
                  >
                    {uploading === d.id ? "アップロード中..." : "＋ ファイル追加"}
                  </button>
                </div>
              </div>
              {uploaded.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {uploaded.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                      <span>
                        📄 {f.fileName}{" "}
                        <span className="text-xs text-slate-500">
                          ({Math.round(f.fileSize / 1024)}KB)
                        </span>
                      </span>
                      <button
                        className="text-xs text-rose-600 hover:underline"
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
