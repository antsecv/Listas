"use client";

import { useEffect, useState } from "react";
import { calculateQuantityToBuy, getBuyQuantityClass } from "@/lib/shopping";

type QuantityToBuyBadgeProps = {
  eventName: string;
  scopeKey: "listId" | "templateId";
  scopeId: string;
  itemId: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
};

export function QuantityToBuyBadge({ eventName, scopeKey, scopeId, itemId, currentStock, minimumStock, maximumStock }: QuantityToBuyBadgeProps) {
  const [stock, setStock] = useState(currentStock);

  useEffect(() => {
    setStock(currentStock);
  }, [currentStock, itemId, scopeId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;

      if (customEvent.detail?.[scopeKey] !== scopeId || customEvent.detail?.itemId !== itemId) {
        return;
      }

      const nextStock = Number(customEvent.detail.currentStock);

      if (Number.isFinite(nextStock)) {
        setStock(nextStock);
      }
    };

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
    };
  }, [eventName, itemId, scopeId, scopeKey]);

  const buy = calculateQuantityToBuy(stock, minimumStock, maximumStock);

  return <span className={`badge ${getBuyQuantityClass(buy)}`}>{buy}</span>;
}
