import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canChangeListStatus } from "@/lib/permissions";
import { shoppingListStatusValues } from "@/lib/shopping";
import type { UserRole } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const userId = String(token?.sub ?? "");
  const role = String(token?.role ?? "") as UserRole;

  if (!userId || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sessionUser = { id: userId, role };

  if (!canChangeListStatus(sessionUser)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = String(body?.status ?? "").trim();

  if (!id || !shoppingListStatusValues.includes(status as (typeof shoppingListStatusValues)[number])) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({ where: { id } });

  if (!list) {
    return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
  }

  if (role === "COMPRADOR" && list.status === "BORRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  await prisma.shoppingList.update({
    where: { id },
    data: {
      status: status as (typeof shoppingListStatusValues)[number],
      statusUpdatedAt: new Date(),
      statusUpdatedById: userId
    }
  });

  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);

  return NextResponse.json({ ok: true });
}
