import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canManagePurchases } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

export async function POST(request: Request, context: RouteContext) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const userId = String(token?.sub ?? "");
  const role = String(token?.role ?? "") as UserRole;

  if (!userId || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!id || !body || !Object.prototype.hasOwnProperty.call(body, "purchaseTotalCost")) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const purchaseTotalCost = parseDecimal(body.purchaseTotalCost);

  if (purchaseTotalCost === undefined) {
    return NextResponse.json({ error: "Costo inválido" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({ where: { id }, include: { items: true } });

  if (!list) {
    return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
  }

  const sessionUser = { id: userId, role };

  if (!canManagePurchases(sessionUser, list)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  if (list.purchaseCostMode !== "TOTAL_LISTA") {
    return NextResponse.json({ error: "Esta lista usa costo por producto" }, { status: 400 });
  }

  await prisma.shoppingList.update({
    where: { id },
    data: { purchaseTotalCost }
  });

  revalidatePath(`/lists/${id}`);

  return NextResponse.json({ ok: true, listId: id, purchaseTotalCost });
}
