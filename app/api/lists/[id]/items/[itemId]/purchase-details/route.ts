import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canManagePurchases } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
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

  const { id, itemId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!id || !itemId || !body) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({ where: { id }, include: { items: true } });

  if (!list) {
    return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
  }

  const sessionUser = { id: userId, role };

  if (!canManagePurchases(sessionUser, list)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const item = list.items.find((current) => current.id === itemId);

  if (!item) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const data: { purchasedQuantity?: number | null; purchaseCost?: number | null } = {};

  if (Object.prototype.hasOwnProperty.call(body, "purchasedQuantity")) {
    const purchasedQuantity = parseDecimal(body.purchasedQuantity);

    if (purchasedQuantity === undefined) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    data.purchasedQuantity = purchasedQuantity;
  }

  if (Object.prototype.hasOwnProperty.call(body, "purchaseCost")) {
    const purchaseCost = parseDecimal(body.purchaseCost);

    if (purchaseCost === undefined) {
      return NextResponse.json({ error: "Costo inválido" }, { status: 400 });
    }

    data.purchaseCost = list.purchaseCostMode === "POR_PRODUCTO" ? purchaseCost : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data
  });

  const updatedItem = await prisma.shoppingListItem.findFirst({
    where: { id: itemId },
    select: {
      purchasedQuantity: true,
      purchaseCost: true,
      purchaseStatus: true
    }
  });

  revalidatePath(`/lists/${id}`);

  return NextResponse.json({
    ok: true,
    listId: id,
    itemId,
    purchasedQuantity: updatedItem?.purchasedQuantity === null ? null : Number(updatedItem?.purchasedQuantity ?? 0),
    purchaseCost: updatedItem?.purchaseCost === null ? null : Number(updatedItem?.purchaseCost ?? 0),
    purchaseStatus: updatedItem?.purchaseStatus
  });
}
