import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";
import type { User, Project } from "@prisma/client";

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function withUser<T>(
  handler: (user: User) => Promise<T>
): Promise<T | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  return handler(user);
}

export async function withProject<T>(
  user: User,
  projectId: string,
  handler: (project: Project) => Promise<T>
): Promise<T | NextResponse> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return jsonError("Not Found", 404);
  if (user.role === "CLIENT" && user.companyId !== project.companyId) {
    return jsonError("Forbidden", 403);
  }
  return handler(project);
}

export async function logActivity(
  projectId: string | null,
  userId: string | null,
  actionType: string,
  actionDetail: string,
  metadata?: unknown
) {
  await prisma.activityLog.create({
    data: {
      projectId: projectId ?? undefined,
      userId: userId ?? undefined,
      actionType,
      actionDetail,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
