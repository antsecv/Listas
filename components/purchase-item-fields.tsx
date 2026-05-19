"use client";

import { useEffect, useState } from "react";
import { AutoSaveDecimalField } from "@/components/auto-save-decimal-field";
import { type PurchaseCostMode, type PurchaseStatus } from "@/lib/shopping";

type PurchaseItemFieldsProps = {
  listId: string;
  itemId: string;
  itemName: string;
  initialPurchaseStatus: PurchaseStatus;
  initialPurchasedQuantity: number | null;
  initialPurchaseCost: number | null;
  purchaseCostMode: PurchaseCostMode;
};

export function PurchaseItemFields({
  listId,
  itemId,
  itemName,
  initialPurchaseStatus,
  initialPurchasedQuantity,
  initialPurchaseCost,
  purchaseCostMode
}: PurchaseItemFieldsProps) {
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>(initialPurchaseStatus);
  const [purchasedQuantity, setPurchasedQuantity] = useState<number | null>(initialPurchasedQuantity);
  const [purchaseCost, setPurchaseCost] = useState<number | null>(initialPurchaseCost);

  useEffect(() => {
    setPurchaseStatus(initialPurchaseStatus);
    setPurchasedQuantity(initialPurchasedQuantity);
    setPurchaseCost(initialPurchaseCost);
  }, [initialPurchaseCost, initialPurchasedQuantity, initialPurchaseStatus, itemId, listId]);

  useEffect(() => {
    const onStockSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId || customEvent.detail?.itemId !== itemId) {
        return;
      }

      const nextStatus = String(customEvent.detail.purchaseStatus ?? "");

      if (nextStatus) {
        setPurchaseStatus(nextStatus as PurchaseStatus);

        if (nextStatus === "NO_REQUIERE") {
          setPurchasedQuantity(null);
          setPurchaseCost(null);
        }
      }
    };

    const onPurchaseStatusSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId || customEvent.detail?.itemId !== itemId) {
        return;
      }

      const nextStatus = String(customEvent.detail.purchaseStatus ?? "");

      if (nextStatus) {
        setPurchaseStatus(nextStatus as PurchaseStatus);
      }

      if (Object.prototype.hasOwnProperty.call(customEvent.detail, "purchasedQuantity")) {
        const value = customEvent.detail.purchasedQuantity;
        setPurchasedQuantity(value === null ? null : Number(value));
      }

      if (Object.prototype.hasOwnProperty.call(customEvent.detail, "purchaseCost")) {
        const value = customEvent.detail.purchaseCost;
        setPurchaseCost(value === null ? null : Number(value));
      }
    };

    const onPurchaseDetailsSaved = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.listId !== listId || customEvent.detail?.itemId !== itemId) {
        return;
      }

      if (Object.prototype.hasOwnProperty.call(customEvent.detail, "purchasedQuantity")) {
        const value = customEvent.detail.purchasedQuantity;
        setPurchasedQuantity(value === null ? null : Number(value));
      }

      if (Object.prototype.hasOwnProperty.call(customEvent.detail, "purchaseCost")) {
        const value = customEvent.detail.purchaseCost;
        setPurchaseCost(value === null ? null : Number(value));
      }
    };

    window.addEventListener("shopping-list-stock-saved", onStockSaved);
    window.addEventListener("shopping-list-purchase-status-saved", onPurchaseStatusSaved);
    window.addEventListener("shopping-list-purchase-details-saved", onPurchaseDetailsSaved);

    return () => {
      window.removeEventListener("shopping-list-stock-saved", onStockSaved);
      window.removeEventListener("shopping-list-purchase-status-saved", onPurchaseStatusSaved);
      window.removeEventListener("shopping-list-purchase-details-saved", onPurchaseDetailsSaved);
    };
  }, [itemId, listId]);

  return (
    <>
      <td data-label="Comprado">
        {purchaseStatus === "NO_REQUIERE" ? (
          <span className="muted">No requiere</span>
        ) : (
          <AutoSaveDecimalField
            endpoint={`/api/lists/${listId}/items/${itemId}/purchase-details`}
            fieldName="purchasedQuantity"
            defaultValue={purchasedQuantity}
            step="0.001"
            inputMode="decimal"
            className="inline-number"
            ariaLabel={`Cantidad comprada de ${itemName}`}
            eventName="shopping-list-purchase-details-saved"
            eventDetail={{ listId, itemId }}
          />
        )}
      </td>
      {purchaseCostMode === "POR_PRODUCTO" ? (
        <td data-label="Costo">
          {purchaseStatus === "NO_REQUIERE" ? (
            <span className="muted">No requiere</span>
          ) : (
            <AutoSaveDecimalField
              endpoint={`/api/lists/${listId}/items/${itemId}/purchase-details`}
              fieldName="purchaseCost"
              defaultValue={purchaseCost}
              step="0.01"
              inputMode="decimal"
              className="inline-number"
              ariaLabel={`Costo comprado de ${itemName}`}
              eventName="shopping-list-purchase-details-saved"
              eventDetail={{ listId, itemId }}
            />
          )}
        </td>
      ) : null}
    </>
  );
}
