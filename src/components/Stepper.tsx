"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STEP_LABELS, STEP_ORDER, STEP_PATHS } from "@/lib/steps";

export default function Stepper({
  projectId,
  stepStatuses,
}: {
  projectId: string;
  stepStatuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "RETURNED">;
}) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 overflow-x-auto">
      <ol className="flex gap-2 whitespace-nowrap text-xs">
        {STEP_ORDER.map((code, i) => {
          const href = `/projects/${projectId}/${STEP_PATHS[code]}`;
          const active = pathname === href;
          const status = stepStatuses[code] || "NOT_STARTED";
          const color =
            status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
              : status === "IN_PROGRESS"
              ? "bg-brand-50 text-brand-700 border-brand-300"
              : status === "RETURNED"
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : "bg-slate-100 text-slate-600 border-slate-200";
          return (
            <li key={code}>
              <Link
                href={href}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 ${color} ${
                  active ? "ring-2 ring-brand-500" : ""
                }`}
              >
                <span className="font-semibold">{i + 1}</span>
                <span>{STEP_LABELS[code].replace(/^Step\d+\s?/, "")}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
