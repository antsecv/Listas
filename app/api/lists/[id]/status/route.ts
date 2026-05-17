import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canChangeListStatus } from "@/lib/permissions";
import { shoppingListStatusValues } from "@/lib/shopping";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canChangeListStatus(session.user)) {
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

  if (session.user.role === "COMPRADOR" && list.status === "BORRADOR") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  await prisma.shoppingList.update({
    where: { id },
    data: { status: status as (typeof shoppingListStatusValues)[number] }
  });

  return NextResponse.json({ ok: true });
}
