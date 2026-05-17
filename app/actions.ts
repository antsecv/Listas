"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyCredentials } from "@/lib/auth-credentials";
import { canCreateLists, canEditList, canManagePurchases, canReviewProducts, canSendListToReview } from "@/lib/permissions";
import { requireAdmin } from "@/lib/session";
import {
  calculateQuantityToBuy,
  derivePurchaseStatus,
  getNextShoppingListStatus,
  purchaseStatusValues,
  reviewStatusValues,
  shoppingListStatusValues,
  parseNonNegativeInt
} from "@/lib/shopping";
import { requireUser } from "@/lib/session";

function errPath(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

function okPath(path: string, message: string) {
  return `${path}?success=${encodeURIComponent(message)}`;
}

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    redirect(errPath("/register", "Completa nombre, correo y contraseña."));
  }

  if (password.length < 6) {
    redirect(errPath("/register", "La contraseña debe tener al menos 6 caracteres."));
  }

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    redirect(errPath("/register", "Ese correo ya está registrado."));
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: (await prisma.user.count({ where: { role: "ADMIN" } })) === 0 ? "ADMIN" : "SOLICITANTE"
    }
  });

  const user = await verifyCredentials(email, password);

  if (!user) {
    redirect(errPath("/register", "No se pudo crear la sesión inicial."));
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard"
  });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(errPath("/login", "Completa correo y contraseña."));
  }

  const user = await verifyCredentials(email, password);

  if (!user) {
    redirect(errPath("/login", "Correo o contraseña incorrectos."));
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard"
  });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createShoppingListAction(formData: FormData) {
  const user = await requireUser();
  if (!canCreateLists(user)) {
    redirect(errPath("/lists", "No tienes permiso para crear listas."));
  }

  const templateId = String(formData.get("templateId") ?? "").trim();
  const id = randomUUID();
  const name = `Lista ${id.slice(0, 8)}`;

  const template = templateId
    ? await prisma.template.findFirst({
        where: { id: templateId },
        include: { items: true }
      })
    : null;

  if (templateId && !template) {
    redirect(errPath("/lists/new", "La plantilla seleccionada no existe."));
  }

  const list = await prisma.shoppingList.create({
    data: {
      id,
      name,
      authorId: user.id,
      status: "BORRADOR",
      statusUpdatedAt: new Date(),
      statusUpdatedById: user.id,
      items: template
        ? {
            create: template.items.map((item) => ({
              name: item.name,
              minimumStock: item.minimumStock,
              maximumStock: item.maximumStock,
              currentStock: item.currentStock,
              reviewStatus: "PENDIENTE",
              purchaseStatus: derivePurchaseStatus(item.currentStock, item.minimumStock)
            }))
          }
        : undefined
    }
  });

  revalidatePath("/lists");
  revalidatePath("/dashboard");
  redirect(okPath(`/lists/${list.id}`, "Lista creada correctamente."));
}

export async function cycleShoppingListStatusAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();

  if (!listId) {
    redirect(errPath("/lists", "No se pudo cambiar el estado."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId, authorId: user.id } });

  if (!list) {
    redirect(errPath("/lists", "La lista no existe."));
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: { status: getNextShoppingListStatus(list.status) }
  });

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/dashboard");
  redirect(okPath("/lists", "Estado actualizado."));
}

export async function updateShoppingListStatusAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!listId || !status) {
    redirect(errPath("/lists", "No se pudo actualizar el estado."));
  }

  if (!shoppingListStatusValues.includes(status as (typeof shoppingListStatusValues)[number])) {
    redirect(errPath("/lists", "El estado seleccionado no es válido."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId, authorId: user.id } });

  if (!list) {
    redirect(errPath("/lists", "La lista no existe."));
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: { status: status as (typeof shoppingListStatusValues)[number] }
  });

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/dashboard");
  redirect(okPath("/lists", "Estado actualizado."));
}

export async function updateShoppingListAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!listId || !name) {
    redirect(errPath("/lists", "Datos incompletos para actualizar la lista."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId, authorId: user.id } });

  if (!list) {
    redirect(errPath("/lists", "La lista no existe."));
  }

  if (!canEditList(user, list)) {
    redirect(errPath(`/lists/${listId}`, "No tienes permiso para editar esta lista."));
  }

  await prisma.shoppingList.update({ where: { id: listId }, data: { name } });
  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  redirect(okPath(`/lists/${listId}`, "Lista actualizada."));
}

export async function deleteShoppingListAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();

  if (!listId) {
    redirect(errPath("/lists", "No se pudo eliminar la lista."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId } });

  if (!list) {
    redirect(errPath("/lists", "La lista no existe."));
  }

  if (!canEditList(user, list)) {
    redirect(errPath("/lists", "No tienes permiso para eliminar esta lista."));
  }

  await prisma.shoppingList.delete({ where: { id: listId } });
  revalidatePath("/lists");
  revalidatePath("/dashboard");
  redirect(okPath("/lists", "Lista eliminada."));
}

export async function addShoppingListItemAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  try {
    const minimumStock = parseNonNegativeInt(formData.get("minimumStock"));
    const maximumStock = parseNonNegativeInt(formData.get("maximumStock"));
    const currentStock = parseNonNegativeInt(formData.get("currentStock"));

    if (!listId || !name) {
      throw new Error("Completa el nombre del producto.");
    }

    if (maximumStock < minimumStock) {
      throw new Error("El máximo debe ser mayor o igual que el mínimo.");
    }

    const list = await prisma.shoppingList.findFirst({ where: { id: listId } });

    if (!list) {
      throw new Error("La lista no existe.");
    }

    if (!canReviewProducts(user, list)) {
      throw new Error("No tienes permiso para editar esta lista.");
    }

    await prisma.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        name,
        minimumStock,
        maximumStock,
        currentStock,
        reviewStatus: "PENDIENTE",
        purchaseStatus: derivePurchaseStatus(currentStock, minimumStock)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el producto.";
    redirect(errPath(`/lists/${listId}`, message));
  }

  revalidatePath(`/lists/${listId}`);
  revalidatePath("/lists");
  redirect(okPath(`/lists/${listId}`, "Producto agregado."));
}

export async function updateShoppingListItemAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  try {
    const minimumStock = parseNonNegativeInt(formData.get("minimumStock"));
    const maximumStock = parseNonNegativeInt(formData.get("maximumStock"));
    const currentStock = parseNonNegativeInt(formData.get("currentStock"));

    if (!listId || !itemId || !name) {
      throw new Error("Completa todos los campos del producto.");
    }

    if (maximumStock < minimumStock) {
      throw new Error("El máximo debe ser mayor o igual que el mínimo.");
    }

    const list = await prisma.shoppingList.findFirst({ where: { id: listId } });

    if (!list) {
      throw new Error("La lista no existe.");
    }

    if (!canReviewProducts(user, list)) {
      throw new Error("No tienes permiso para editar esta lista.");
    }

    const item = await prisma.shoppingListItem.findFirst({
      where: { id: itemId, shoppingListId: listId }
    });

    if (!item) {
      throw new Error("El producto no existe.");
    }

    await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        name,
        minimumStock,
        maximumStock,
        currentStock,
        reviewStatus: "REVISADO",
        reviewedAt: new Date(),
        reviewedById: user.id,
        omitReason: null,
        purchaseStatus: derivePurchaseStatus(currentStock, minimumStock)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el producto.";
    redirect(errPath(`/lists/${listId}`, message));
  }

  revalidatePath(`/lists/${listId}`);
  redirect(okPath(`/lists/${listId}`, "Producto actualizado."));
}

export async function deleteShoppingListItemAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (!listId || !itemId) {
    redirect(errPath(`/lists/${listId || ""}`, "No se pudo eliminar el producto."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId } });

  if (!list) {
    redirect(errPath(`/lists/${listId}`, "La lista no existe."));
  }

  if (!canReviewProducts(user, list)) {
    redirect(errPath(`/lists/${listId}`, "No tienes permiso para editar esta lista."));
  }

  await prisma.shoppingListItem.deleteMany({ where: { id: itemId, shoppingListId: listId } });
  revalidatePath(`/lists/${listId}`);
  redirect(okPath(`/lists/${listId}`, "Producto eliminado."));
}

export async function omitShoppingListItemAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const omitReason = String(formData.get("omitReason") ?? "").trim();

  if (!listId || !itemId || !omitReason) {
    redirect(errPath(`/lists/${listId || ""}`, "Debes indicar un motivo para omitir el producto."));
  }

  const list = await prisma.shoppingList.findFirst({ where: { id: listId } });

  if (!list) {
    redirect(errPath(`/lists/${listId}`, "La lista no existe."));
  }

  if (!canReviewProducts(user, list)) {
    redirect(errPath(`/lists/${listId}`, "No tienes permiso para omitir productos en esta lista."));
  }

  const item = await prisma.shoppingListItem.findFirst({ where: { id: itemId, shoppingListId: listId } });

  if (!item) {
    redirect(errPath(`/lists/${listId}`, "El producto no existe."));
  }

  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      reviewStatus: "OMITIDO",
      reviewedAt: new Date(),
      reviewedById: user.id,
      omitReason,
      purchaseStatus: "NO_REQUIERE"
    }
  });

  revalidatePath(`/lists/${listId}`);
  redirect(okPath(`/lists/${listId}`, "Producto omitido."));
}

export async function sendShoppingListToReviewAction(formData: FormData) {
  const user = await requireUser();
  const listId = String(formData.get("listId") ?? "").trim();

  if (!listId) {
    redirect(errPath("/lists", "No se pudo enviar la lista."));
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id: listId },
    include: { items: true }
  });

  if (!list) {
    redirect(errPath("/lists", "La lista no existe."));
  }

  if (!canSendListToReview(user, list)) {
    redirect(errPath(`/lists/${listId}`, "No tienes permiso para enviar esta lista."));
  }

  const pendingItems = list.items.filter((item) => item.reviewStatus === "PENDIENTE");

  if (pendingItems.length > 0) {
    redirect(errPath(`/lists/${listId}`, `Faltan ${pendingItems.length} productos por revisar.`));
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: {
      status: "EN_REVISION",
      statusUpdatedAt: new Date(),
      statusUpdatedById: user.id,
    }
  });

  await prisma.$transaction(
    list.items.map((item) =>
      prisma.shoppingListItem.update({
        where: { id: item.id },
        data: {
          purchaseStatus: item.reviewStatus === "OMITIDO" ? "NO_REQUIERE" : derivePurchaseStatus(item.currentStock, item.minimumStock, item.reviewStatus)
        }
      })
    )
  );

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/dashboard");
  redirect(okPath(`/lists/${listId}`, "Lista enviada a revisión."));
}

export async function createTemplateAction(formData: FormData) {
  const user = await requireAdmin();
  const id = randomUUID();
  const name = `Plantilla ${id.slice(0, 8)}`;

  const template = await prisma.template.create({
    data: {
      id,
      name,
      authorId: user.id
    }
  });

  revalidatePath("/templates");
  revalidatePath("/dashboard");
  redirect(okPath(`/templates/${template.id}`, "Plantilla creada."));
}

export async function updateTemplateAction(formData: FormData) {
  const user = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!templateId || !name) {
    redirect(errPath("/templates", "Datos incompletos para actualizar la plantilla."));
  }

  const template = await prisma.template.findFirst({ where: { id: templateId, authorId: user.id } });

  if (!template) {
    redirect(errPath("/templates", "La plantilla no existe."));
  }

  await prisma.template.update({ where: { id: templateId }, data: { name } });
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  redirect(okPath(`/templates/${templateId}`, "Plantilla actualizada."));
}

export async function deleteTemplateAction(formData: FormData) {
  const user = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();

  if (!templateId) {
    redirect(errPath("/templates", "No se pudo eliminar la plantilla."));
  }

  const template = await prisma.template.findFirst({ where: { id: templateId, authorId: user.id } });

  if (!template) {
    redirect(errPath("/templates", "La plantilla no existe."));
  }

  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/templates");
  revalidatePath("/dashboard");
  redirect(okPath("/templates", "Plantilla eliminada."));
}

export async function addTemplateItemAction(formData: FormData) {
  const user = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  try {
    const minimumStock = parseNonNegativeInt(formData.get("minimumStock"));
    const maximumStock = parseNonNegativeInt(formData.get("maximumStock"));
    const currentStock = parseNonNegativeInt(formData.get("currentStock"));

    if (!templateId || !name) {
      throw new Error("Completa el nombre del producto.");
    }

    if (maximumStock < minimumStock) {
      throw new Error("El máximo debe ser mayor o igual que el mínimo.");
    }

    const template = await prisma.template.findFirst({ where: { id: templateId, authorId: user.id } });

    if (!template) {
      throw new Error("La plantilla no existe.");
    }

    await prisma.templateItem.create({
      data: {
        templateId,
        name,
        minimumStock,
        maximumStock,
        currentStock
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el producto.";
    redirect(errPath(`/templates/${templateId}`, message));
  }

  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/templates");
  redirect(okPath(`/templates/${templateId}`, "Producto agregado."));
}

export async function updateTemplateItemAction(formData: FormData) {
  const user = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  try {
    const minimumStock = parseNonNegativeInt(formData.get("minimumStock"));
    const maximumStock = parseNonNegativeInt(formData.get("maximumStock"));
    const currentStock = parseNonNegativeInt(formData.get("currentStock"));

    if (!templateId || !itemId || !name) {
      throw new Error("Completa todos los campos del producto.");
    }

    if (maximumStock < minimumStock) {
      throw new Error("El máximo debe ser mayor o igual que el mínimo.");
    }

    const template = await prisma.template.findFirst({ where: { id: templateId, authorId: user.id } });

    if (!template) {
      throw new Error("La plantilla no existe.");
    }

    const item = await prisma.templateItem.findFirst({ where: { id: itemId, templateId } });

    if (!item) {
      throw new Error("El producto no existe.");
    }

    await prisma.templateItem.update({
      where: { id: itemId },
      data: { name, minimumStock, maximumStock, currentStock }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el producto.";
    redirect(errPath(`/templates/${templateId}`, message));
  }

  revalidatePath(`/templates/${templateId}`);
  redirect(okPath(`/templates/${templateId}`, "Producto actualizado."));
}

export async function deleteTemplateItemAction(formData: FormData) {
  const user = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (!templateId || !itemId) {
    redirect(errPath(`/templates/${templateId || ""}`, "No se pudo eliminar el producto."));
  }

  const template = await prisma.template.findFirst({ where: { id: templateId, authorId: user.id } });

  if (!template) {
    redirect(errPath(`/templates/${templateId}`, "La plantilla no existe."));
  }

  await prisma.templateItem.deleteMany({ where: { id: itemId, templateId } });
  revalidatePath(`/templates/${templateId}`);
  redirect(okPath(`/templates/${templateId}`, "Producto eliminado."));
}

export async function updateUserRoleAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!userId || !role) {
    redirect(errPath("/admin/users", "Datos incompletos para cambiar el rol."));
  }

  if (!["ADMIN", "SOLICITANTE", "COMPRADOR"].includes(role)) {
    redirect(errPath("/admin/users", "El rol seleccionado no es válido."));
  }

  const target = await prisma.user.findFirst({ where: { id: userId } });

  if (!target) {
    redirect(errPath("/admin/users", "El usuario no existe."));
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

  if (target.role === "ADMIN" && role !== "ADMIN" && adminCount <= 1) {
    redirect(errPath("/admin/users", "Debe existir al menos un administrador."));
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as "ADMIN" | "SOLICITANTE" | "COMPRADOR" }
  });

  revalidatePath("/admin/users");
  redirect(okPath("/admin/users", "Rol actualizado."));
}

export async function getListSummary(listId: string, userId: string) {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, authorId: userId },
    include: { items: true }
  });

  if (!list) {
    return null;
  }

  return {
    ...list,
    totalToBuy: list.items.reduce((sum, item) => sum + calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock), 0)
  };
}
