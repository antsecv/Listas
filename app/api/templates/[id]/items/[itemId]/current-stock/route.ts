import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canManageTemplates } from "@/lib/permissions";
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

  if (!canManageTemplates({ id: userId, role })) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id, itemId } = await context.params;
  const body = (await request.json().catch(() => null)) as { currentStock?: number | string } | null;
  const currentStock = Number.parseInt(String(body?.currentStock ?? "").trim(), 10);

  if (!id || !itemId || !Number.isInteger(currentStock) || currentStock < 0) {
    return NextResponse.json({ error: "Existencia inválida" }, { status: 400 });
  }

  const template = await prisma.template.findFirst({ where: { id, authorId: userId }, include: { items: true } });

  if (!template) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  const item = template.items.find((current) => current.id === itemId);

  if (!item) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  await prisma.templateItem.update({
    where: { id: itemId },
    data: { currentStock }
  });

  revalidatePath(`/templates/${id}`);

  return NextResponse.json({ ok: true, templateId: id, itemId, currentStock });
}
