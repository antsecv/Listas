import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canManagePurchases } from "@/lib/permissions";
import { purchaseStatusValues } from "@/lib/shopping";
import type { UserRole } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const userId = String(token?.sub ?? "");
  const role = String(token?.role ?? "") as UserRole;

  if (!userId || !role) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, itemId } = await context.params;
  const body = (await request.json().catch(() => null)) as { purchaseStatus?: string } | null;
  const purchaseStatus = String(body?.purchaseStatus ?? "").trim();

  if (!id || !itemId || !purchaseStatus || !purchaseStatusValues.includes(purchaseStatus as (typeof purchaseStatusValues)[number])) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
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

  if (purchaseStatus === "COMPRADO") {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: new Date(),
        purchasedById: userId
      }
    });
  } else if (purchaseStatus === "NO_DISPONIBLE") {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: new Date(),
        purchasedById: userId,
        purchasedQuantity: null,
        purchaseCost: null
      }
    });
  } else if (purchaseStatus === "NO_REQUIERE") {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: null,
        purchasedById: null,
        purchasedQuantity: null,
        purchaseCost: null
      }
    });
  } else {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: null,
        purchasedById: null,
        purchasedQuantity: null,
        purchaseCost: null
      }
    });
  }

  const updatedItem = await prisma.shoppingListItem.findFirst({
    where: { id: itemId },
    select: {
      purchaseStatus: true,
      purchasedQuantity: true,
      purchaseCost: true
    }
  });

  revalidatePath(`/lists/${id}`);

  return NextResponse.json({
    ok: true,
    listId: id,
    itemId,
    purchaseStatus: updatedItem?.purchaseStatus ?? purchaseStatus,
    purchasedQuantity: updatedItem?.purchasedQuantity === null ? null : Number(updatedItem?.purchasedQuantity ?? 0),
    purchaseCost: updatedItem?.purchaseCost === null ? null : Number(updatedItem?.purchaseCost ?? 0)
  });
}
