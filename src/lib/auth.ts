// 簡易セッション管理（Cookie方式）
// 将来的に NextAuth / Auth.js 等に差し替えやすい薄い実装に留めています。

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

const COOKIE_NAME = "jinzai_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const jar = cookies();
  jar.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = cookies().get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return user;
}

/** CLIENT は自社案件のみ、ADMIN/SHAROUSHI/TRAINING_PROVIDER は全件。 */
export function canAccessProject(
  user: User,
  project: { companyId: string; assignedSharoushiUserId: string | null; assignedTrainingProviderUserId: string | null }
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "CLIENT") return user.companyId === project.companyId;
  if (user.role === "SHAROUSHI") return true;
  if (user.role === "TRAINING_PROVIDER") return true;
  return false;
}
