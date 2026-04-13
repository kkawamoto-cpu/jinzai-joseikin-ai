import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Stepper from "@/components/Stepper";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = (await getCurrentUser())!;
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { company: true, steps: true },
  });
  if (!project) return notFound();
  if (user.role === "CLIENT" && user.companyId !== project.companyId) return notFound();

  const stepStatuses = Object.fromEntries(project.steps.map((s) => [s.stepCode, s.stepStatus]));

  return (
    <div>
      <header className="border-b bg-white px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-slate-500">
              <Link href="/projects" className="hover:underline">
                案件一覧
              </Link>
              <span className="mx-1">/</span>
              <span>{project.company.companyName}</span>
            </div>
            <h1 className="mt-0.5 text-base font-bold sm:text-lg">{project.projectName}</h1>
          </div>
          <Link
            href={`/projects/${project.id}/ai-assistant`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            🪄 AI入力代行
          </Link>
          <div className="flex w-full flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="pill-blue">
              {project.subsidyCourse === "JIGYO_TENKAI_RESKILLING"
                ? "事業展開等リスキリング支援"
                : project.subsidyCourse}
            </span>
            <span>進捗 {project.progressPercent}%</span>
          </div>
        </div>
      </header>
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <Stepper projectId={project.id} stepStatuses={stepStatuses as any} />
        {children}
      </div>
    </div>
  );
}
