import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canReviewProducts } from "@/lib/permissions";
import { derivePurchaseStatus } from "@/lib/shopping";
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
  const body = (await request.json().catch(() => null)) as { currentStock?: number | string } | null;
  const currentStock = Number.parseInt(String(body?.currentStock ?? "").trim(), 10);

  if (!id || !itemId || !Number.isInteger(currentStock) || currentStock < 0) {
    return NextResponse.json({ error: "Existencia inválida" }, { status: 400 });
  }

  const list = await prisma.shoppingList.findFirst({ where: { id }, include: { items: true } });

  if (!list) {
    return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
  }

  const sessionUser = { id: userId, role };

  if (!canReviewProducts(sessionUser, list)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const item = list.items.find((current) => current.id === itemId);

  if (!item) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const purchaseStatus = derivePurchaseStatus(currentStock, item.minimumStock);

  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      currentStock,
      reviewStatus: "REVISADO",
      reviewedAt: new Date(),
      reviewedById: userId,
      omitReason: null,
      purchaseStatus,
      ...(purchaseStatus === "NO_REQUIERE"
        ? {
            purchasedQuantity: null,
            purchaseCost: null,
            purchasedAt: null,
            purchasedById: null
          }
        : {})
    }
  });

  revalidatePath(`/lists/${id}`);

  return NextResponse.json({
    ok: true,
    listId: id,
    itemId,
    currentStock,
    purchaseStatus,
    reviewStatus: "REVISADO"
  });
}
