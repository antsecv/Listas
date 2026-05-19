"use client";

import { useEffect, useState } from "react";

type ReviewCompletionGateProps = {
  listId: string;
  pendingItemIds: string[];
  visible: boolean;
  sendAction: (formData: FormData) => void | Promise<void>;
};

export function ReviewCompletionGate({ listId, pendingItemIds, visible, sendAction }: ReviewCompletionGateProps) {
  const [pendingIds, setPendingIds] = useState<string[]>(pendingItemIds);

  useEffect(() => {
    setPendingIds(pendingItemIds);
  }, [listId, pendingItemIds]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ listId: string; itemId: string }>;

      if (customEvent.detail?.listId !== listId) {
        return;
      }

      setPendingIds((current) => current.filter((itemId) => itemId !== customEvent.detail.itemId));
    };

    window.addEventListener("shopping-list-stock-saved", handler);

    return () => {
      window.removeEventListener("shopping-list-stock-saved", handler);
    };
  }, [listId]);

  if (!visible) {
    return null;
  }

  if (pendingIds.length > 0) {
    return (
      <div className="card">
        <span className="muted">Faltan {pendingIds.length} productos por revisar</span>
      </div>
    );
  }

  return (
    <form action={sendAction} className="card form">
      <input type="hidden" name="listId" value={listId} />
      <button type="submit" className="button secondary">
        Enviar a revisión
      </button>
    </form>
  );
}
