"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepFooter from "@/components/StepFooter";

export default function Step10Handoff({
  projectId,
  project,
}: {
  projectId: string;
  project: any;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const summary = {
    企業: project.company.companyName,
    事業所数: project.offices.length,
    受講者数: project.trainees.length,
    訓練数: project.trainings.length,
    必要書類: `${project.requiredDocuments.length}件（提出済み ${project.requiredDocuments.filter((d: any) => d.status === "SUBMITTED" || d.status === "APPROVED").length}件）`,
    アップロード済ファイル: `${project.uploadedFiles.length}件`,
    AIチェック: `${project.aiCheckResults.length}件（エラー ${project.aiCheckResults.filter((r: any) => r.severity === "ERROR").length}）`,
  };

  const request = async () => {
    setLoading(true);
    await fetch(`/api/projects/${projectId}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoffNote: note }),
    });
    setLoading(false);
    router.refresh();
  };

  const downloadPackage = () => {
    const pkg = {
      company: project.company,
      project: {
        id: project.id,
        projectName: project.projectName,
        subsidyCourse: project.subsidyCourse,
        trainingStartDate: project.trainingStartDate,
        trainingEndDate: project.trainingEndDate,
      },
      offices: project.offices,
      trainees: project.trainees,
      trainings: project.trainings,
      requiredDocuments: project.requiredDocuments,
      uploadedFiles: project.uploadedFiles,
      aiCheckResults: project.aiCheckResults,
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handoff_${project.projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card mb-4">
        <h2 className="text-lg font-bold">Step10 社労士引継ぎ確認</h2>
        <p className="mt-1 text-sm text-slate-600">
          社労士に引き継ぐための情報パッケージを確認してください。最終申請は社労士が行います。
        </p>
      </div>

      <div className="card mb-4">
        <h3 className="mb-3 font-semibold">引継ぎサマリー</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium">{v as string}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card mb-4">
        <h3 className="mb-3 font-semibold">引継ぎ依頼</h3>
        <label className="label">引継ぎメモ</label>
        <textarea
          className="input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="社労士への補足情報があれば記入してください"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={downloadPackage}>
            ⬇ 引継ぎパッケージ(JSON)
          </button>
          <button className="btn-primary" onClick={request} disabled={loading}>
            {loading ? "送信中..." : "📨 社労士レビュー依頼"}
          </button>
        </div>
      </div>

      {project.handoffRecords?.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">引継ぎ履歴</h3>
          <ul className="space-y-2 text-sm">
            {project.handoffRecords.map((h: any) => (
              <li key={h.id} className="rounded border p-2">
                <div className="flex items-center gap-2">
                  <span className="pill-blue">{h.handoffStatus}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(h.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                {h.handoffNote && <div className="mt-1 text-slate-700">{h.handoffNote}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepFooter projectId={projectId} stepCode="STEP_10_HANDOFF" />
    </div>
  );
}
