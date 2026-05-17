import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    return null;
  }

  const valid = await compare(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

  if (adminCount === 0 && user.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" }
    });
    user.role = "ADMIN";
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
