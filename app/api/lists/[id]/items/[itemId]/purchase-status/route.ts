import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePurchases } from "@/lib/permissions";
import { purchaseStatusValues } from "@/lib/shopping";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
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

  if (!canManagePurchases(session.user, list)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const item = list.items.find((current) => current.id === itemId);

  if (!item) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  if (purchaseStatus === "COMPRADO" || purchaseStatus === "NO_DISPONIBLE") {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: new Date(),
        purchasedById: session.user.id
      }
    });
  } else if (purchaseStatus === "NO_REQUIERE") {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: null,
        purchasedById: null
      }
    });
  } else {
    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchaseStatus: purchaseStatus as (typeof purchaseStatusValues)[number],
        purchasedAt: null,
        purchasedById: null
      }
    });
  }

  return NextResponse.json({ ok: true });
}
