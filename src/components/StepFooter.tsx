"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STEP_ORDER, STEP_PATHS } from "@/lib/steps";

export default function StepFooter({
  projectId,
  stepCode,
  onSaveDraft,
  onComplete,
  nextDisabled,
}: {
  projectId: string;
  stepCode: (typeof STEP_ORDER)[number];
  onSaveDraft?: () => Promise<void> | void;
  onComplete?: () => Promise<void> | void;
  nextDisabled?: boolean;
}) {
  const router = useRouter();
  const idx = STEP_ORDER.indexOf(stepCode);
  const prev = idx > 0 ? STEP_ORDER[idx - 1] : null;
  const next = idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;

  const markStep = async (status: "IN_PROGRESS" | "COMPLETED") => {
    await fetch(`/api/projects/${projectId}/steps/${stepCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepStatus: status }),
    });
  };

  return (
    <div className="mt-8 flex items-center justify-between border-t pt-4">
      {prev ? (
        <Link
          href={`/projects/${projectId}/${STEP_PATHS[prev]}`}
          className="btn-secondary"
        >
          ← 戻る
        </Link>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          onClick={async () => {
            if (onSaveDraft) await onSaveDraft();
            await markStep("IN_PROGRESS");
            router.refresh();
          }}
        >
          下書き保存
        </button>
        {next && (
          <button
            className="btn-primary"
            disabled={nextDisabled}
            onClick={async () => {
              if (onComplete) await onComplete();
              await markStep("COMPLETED");
              router.push(`/projects/${projectId}/${STEP_PATHS[next]}`);
              router.refresh();
            }}
          >
            保存して次へ →
          </button>
        )}
      </div>
    </div>
  );
}
