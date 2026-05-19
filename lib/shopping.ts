export function calculateQuantityToBuy(currentStock: number, minimumStock: number, maximumStock: number) {
  if (currentStock > minimumStock) {
    return 0;
  }

  return Math.max(maximumStock - currentStock, 0);
}

export const shoppingListStatusValues = ["BORRADOR", "EN_REVISION", "EN_COMPRA", "DESPACHADA", "CANCELADA"] as const;

export const reviewStatusValues = ["PENDIENTE", "REVISADO", "OMITIDO"] as const;

export const purchaseStatusValues = ["PENDIENTE_COMPRA", "COMPRADO", "NO_REQUIERE", "NO_DISPONIBLE"] as const;

export const purchaseCostModeValues = ["TOTAL_LISTA", "POR_PRODUCTO"] as const;

export type ShoppingListStatus = (typeof shoppingListStatusValues)[number];

export type ReviewStatus = (typeof reviewStatusValues)[number];

export type PurchaseStatus = (typeof purchaseStatusValues)[number];

export type PurchaseCostMode = (typeof purchaseCostModeValues)[number];

export function getShoppingListStatusLabel(status: ShoppingListStatus) {
  switch (status) {
    case "BORRADOR":
      return "Borrador";
    case "EN_REVISION":
      return "En revisión";
    case "EN_COMPRA":
      return "En compra";
    case "DESPACHADA":
      return "Despachada";
    case "CANCELADA":
      return "Cancelada";
  }
}

export function getShoppingListStatusClass(status: ShoppingListStatus) {
  switch (status) {
    case "BORRADOR":
      return "status-pending";
    case "EN_REVISION":
      return "status-review";
    case "EN_COMPRA":
      return "status-button-pending";
    case "DESPACHADA":
      return "status-dispatched";
    case "CANCELADA":
      return "status-cancelled";
  }
}

export function getShoppingListStatusButtonClass(status: ShoppingListStatus) {
  switch (status) {
    case "BORRADOR":
      return "status-button-pending";
    case "EN_REVISION":
      return "status-button-review";
    case "EN_COMPRA":
      return "status-button-pending";
    case "DESPACHADA":
      return "status-button-dispatched";
    case "CANCELADA":
      return "status-button-cancelled";
  }
}

export function getReviewStatusLabel(status: ReviewStatus) {
  switch (status) {
    case "PENDIENTE":
      return "Pendiente";
    case "REVISADO":
      return "Revisado";
    case "OMITIDO":
      return "Omitido";
  }
}

export function getPurchaseStatusLabel(status: PurchaseStatus) {
  switch (status) {
    case "PENDIENTE_COMPRA":
      return "Por comprar";
    case "COMPRADO":
      return "Comprado";
    case "NO_REQUIERE":
      return "No requiere";
    case "NO_DISPONIBLE":
      return "No disponible";
  }
}

export function getPurchaseStatusClass(status: PurchaseStatus) {
  switch (status) {
    case "PENDIENTE_COMPRA":
      return "buy-high";
    case "COMPRADO":
      return "buy-none";
    case "NO_REQUIERE":
      return "buy-none";
    case "NO_DISPONIBLE":
      return "status-cancelled";
  }
}

export function getPurchaseCostModeLabel(mode: PurchaseCostMode) {
  switch (mode) {
    case "TOTAL_LISTA":
      return "Costo total de lista";
    case "POR_PRODUCTO":
      return "Costo por producto";
  }
}

export function derivePurchaseStatus(currentStock: number, minimumStock: number, reviewStatus?: ReviewStatus): PurchaseStatus {
  if (reviewStatus === "OMITIDO") {
    return "NO_REQUIERE";
  }

  return currentStock > minimumStock ? "NO_REQUIERE" : "PENDIENTE_COMPRA";
}

export function getBuyQuantityClass(quantity: number) {
  if (quantity <= 0) {
    return "buy-none";
  }

  if (quantity <= 5) {
    return "buy-low";
  }

  if (quantity <= 15) {
    return "buy-medium";
  }

  return "buy-high";
}

export function getNextShoppingListStatus(status: ShoppingListStatus) {
  const index = shoppingListStatusValues.indexOf(status);
  return shoppingListStatusValues[(index + 1) % shoppingListStatusValues.length];
}

export function getNextShoppingListStatusLabel(status: ShoppingListStatus) {
  return getShoppingListStatusLabel(getNextShoppingListStatus(status));
}

export function parseNonNegativeInt(value: FormDataEntryValue | null, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Los valores deben ser enteros no negativos.");
  }

  return parsed;
}

export function parseNonNegativeDecimal(value: FormDataEntryValue | null, fallback: number | null = null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Los valores deben ser decimales no negativos.");
  }

  return parsed;
}

export function formatDecimal(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}
