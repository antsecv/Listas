"use client";

import { useEffect, useState } from "react";

type ReviewStatus = "PENDIENTE" | "REVISADO" | "OMITIDO";

type ReviewStatusBadgeProps = {
  listId: string;
  itemId: string;
  initialStatus: ReviewStatus;
};

function getClassName(status: ReviewStatus) {
  switch (status) {
    case "PENDIENTE":
      return "status-pending";
    case "REVISADO":
      return "status-review";
    case "OMITIDO":
      return "status-cancelled";
  }
}

function getLabel(status: ReviewStatus) {
  switch (status) {
    case "PENDIENTE":
      return "Pendiente";
    case "REVISADO":
      return "Revisado";
    case "OMITIDO":
      return "Omitido";
  }
}

export function ReviewStatusBadge({ listId, itemId, initialStatus }: ReviewStatusBadgeProps) {
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, itemId, listId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ listId: string; itemId: string }>;

      if (customEvent.detail?.listId !== listId || customEvent.detail?.itemId !== itemId) {
        return;
      }

      setStatus("REVISADO");
    };

    window.addEventListener("shopping-list-stock-saved", handler);

    return () => {
      window.removeEventListener("shopping-list-stock-saved", handler);
    };
  }, [itemId, listId]);

  return <span className={`badge ${getClassName(status)}`}>{getLabel(status)}</span>;
}
