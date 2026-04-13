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
      <header className="border-b bg-white px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">
              <Link href="/projects" className="hover:underline">
                案件一覧
              </Link>
              <span className="mx-1">/</span>
              <span>{project.company.companyName}</span>
            </div>
            <h1 className="mt-0.5 text-lg font-bold">{project.projectName}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="pill-blue">
              {project.subsidyCourse === "JIGYO_TENKAI_RESKILLING"
                ? "事業展開等リスキリング支援コース"
                : project.subsidyCourse}
            </span>
            <span>進捗 {project.progressPercent}%</span>
          </div>
        </div>
      </header>
      <div className="px-8 py-6">
        <Stepper projectId={project.id} stepStatuses={stepStatuses as any} />
        {children}
      </div>
    </div>
  );
}
