"use client";

import { useEffect, useState } from "react";
import { calculateQuantityToBuy, formatDecimal, type PurchaseCostMode, type PurchaseStatus, type ReviewStatus } from "@/lib/shopping";

type SummaryItem = {
  id: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reviewStatus: ReviewStatus;
  purchaseStatus: PurchaseStatus;
  purchasedQuantity: number | null;
  purchaseCost: number | null;
};

type ShoppingListLiveSummaryProps = {
  listId: string;
  initialItems: SummaryItem[];
  purchaseCostMode: PurchaseCostMode;
  initialPurchaseTotalCost: number;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ShoppingListLiveSummary({ listId, initialItems, purchaseCostMode, initialPurchaseTotalCost }: ShoppingListLiveSummaryProps) {
  const [items, setItems] = useState(initialItems);
  const [purchaseTotalCost, setPurchaseTotalCost] = useState(initialPurchaseTotalCost);

  useEffect(() => {
    setItems(initialItems);
    setPurchaseTotalCost(initialPurchaseTotalCost);
  }, [initialItems, initialPurchaseTotalCost, listId]);

  useEffect(() => {
    const onStockSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId) {
        return;
      }

      const itemId = String(customEvent.detail.itemId ?? "");
      const currentStock = toNumber(customEvent.detail.currentStock);
      const purchaseStatus = String(customEvent.detail.purchaseStatus ?? "");

      if (currentStock === null) {
        return;
      }

      setItems((current) => current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          currentStock,
          reviewStatus: "REVISADO",
          purchaseStatus: purchaseStatus ? (purchaseStatus as PurchaseStatus) : item.purchaseStatus,
          ...(purchaseStatus === "NO_REQUIERE" ? { purchasedQuantity: null, purchaseCost: null } : {})
        };
      }));
    };

    const onPurchaseStatusSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId) {
        return;
      }

      const itemId = String(customEvent.detail.itemId ?? "");
      const purchaseStatus = String(customEvent.detail.purchaseStatus ?? "");

      setItems((current) => current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          purchaseStatus: purchaseStatus ? (purchaseStatus as PurchaseStatus) : item.purchaseStatus,
          ...(Object.prototype.hasOwnProperty.call(customEvent.detail, "purchasedQuantity")
            ? { purchasedQuantity: customEvent.detail.purchasedQuantity === null ? null : toNumber(customEvent.detail.purchasedQuantity) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(customEvent.detail, "purchaseCost")
            ? { purchaseCost: customEvent.detail.purchaseCost === null ? null : toNumber(customEvent.detail.purchaseCost) }
            : {})
        };
      }));
    };

    const onPurchaseDetailsSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId) {
        return;
      }

      const itemId = String(customEvent.detail.itemId ?? "");

      setItems((current) => current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          ...(Object.prototype.hasOwnProperty.call(customEvent.detail, "purchasedQuantity")
            ? { purchasedQuantity: customEvent.detail.purchasedQuantity === null ? null : toNumber(customEvent.detail.purchasedQuantity) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(customEvent.detail, "purchaseCost")
            ? { purchaseCost: customEvent.detail.purchaseCost === null ? null : toNumber(customEvent.detail.purchaseCost) }
            : {})
        };
      }));
    };

    const onPurchaseTotalSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId) {
        return;
      }

      const nextCost = toNumber(customEvent.detail.purchaseTotalCost);

      setPurchaseTotalCost(nextCost ?? 0);
    };

    window.addEventListener("shopping-list-stock-saved", onStockSaved);
    window.addEventListener("shopping-list-purchase-status-saved", onPurchaseStatusSaved);
    window.addEventListener("shopping-list-purchase-details-saved", onPurchaseDetailsSaved);
    window.addEventListener("shopping-list-purchase-total-saved", onPurchaseTotalSaved);

    return () => {
      window.removeEventListener("shopping-list-stock-saved", onStockSaved);
      window.removeEventListener("shopping-list-purchase-status-saved", onPurchaseStatusSaved);
      window.removeEventListener("shopping-list-purchase-details-saved", onPurchaseDetailsSaved);
      window.removeEventListener("shopping-list-purchase-total-saved", onPurchaseTotalSaved);
    };
  }, [listId]);

  const reviewDone = items.filter((item) => item.reviewStatus !== "PENDIENTE").length;
  const reviewTotal = items.length;
  const purchaseRelevant = items.filter((item) => item.purchaseStatus !== "NO_REQUIERE").length;
  const purchaseDone = items.filter(
    (item) => item.purchaseStatus === "COMPRADO" || item.purchaseStatus === "NO_DISPONIBLE" || item.purchaseStatus === "NO_REQUIERE"
  ).length;
  const totalToBuy = items.reduce((sum, item) => sum + calculateQuantityToBuy(item.currentStock, item.minimumStock, item.maximumStock), 0);
  const totalPurchasedQuantity = items.reduce((sum, item) => sum + Number(item.purchasedQuantity ?? 0), 0);
  const totalPurchaseCost = purchaseCostMode === "TOTAL_LISTA"
    ? purchaseTotalCost
    : items.reduce((sum, item) => sum + Number(item.purchaseCost ?? 0), 0);

  return (
    <div className="grid grid-3">
      <div className="card">
        <div className="muted">Revisión</div>
        <h2>{reviewDone}/{reviewTotal}</h2>
        <p className="muted">Productos revisados</p>
      </div>
      <div className="card">
        <div className="muted">Compra</div>
        <h2>{purchaseDone}/{purchaseRelevant}</h2>
        <p className="muted">Productos resueltos</p>
      </div>
      <div className="card">
        <div className="muted">A comprar</div>
        <h2>{totalToBuy}</h2>
        <p className="muted">Cantidad total sugerida</p>
      </div>
      <div className="card">
        <div className="muted">Comprado</div>
        <h2>{formatDecimal(totalPurchasedQuantity, 3)}</h2>
        <p className="muted">Cantidad realmente comprada</p>
      </div>
      <div className="card">
        <div className="muted">Gasto</div>
        <h2>{formatDecimal(totalPurchaseCost, 2)}</h2>
        <p className="muted">Costo total de compra</p>
      </div>
    </div>
  );
}
