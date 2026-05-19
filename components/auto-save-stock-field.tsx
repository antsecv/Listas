"use client";

import { useEffect, useRef, useState } from "react";
import { calculateQuantityToBuy } from "@/lib/shopping";

type AutoSaveStockFieldProps = {
  endpoint: string;
  listId: string;
  itemId: string;
  defaultValue: number | null;
  minimumStock: number;
  maximumStock: number;
  className?: string;
  ariaLabel: string;
};

export function AutoSaveStockField({ endpoint, listId, itemId, defaultValue, minimumStock, maximumStock, className, ariaLabel }: AutoSaveStockFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(defaultValue === null ? "" : String(defaultValue));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastSavedValueRef = useRef(defaultValue === null ? "" : String(defaultValue));
  const requestIdRef = useRef(0);

  useEffect(() => {
    setValue(defaultValue === null ? "" : String(defaultValue));
    lastSavedValueRef.current = defaultValue === null ? "" : String(defaultValue);
    if (inputRef.current) {
      inputRef.current.value = defaultValue === null ? "" : String(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function saveCurrent(nextValue: string) {
    const raw = nextValue.trim();

    if (!raw) {
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    const parsed = Number.parseInt(raw, 10);

    if (!Number.isInteger(parsed) || parsed < 0) {
      setStatus("error");
      setErrorMessage("La existencia debe ser un entero no negativo.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ currentStock: parsed })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo guardar la existencia actual.");
      }

      const data = (await response.json().catch(() => null)) as { currentStock?: number; purchaseStatus?: string; reviewStatus?: string } | null;

      if (requestId !== requestIdRef.current) {
        return;
      }

      lastSavedValueRef.current = String(parsed);
      setStatus("saved");
      setErrorMessage(null);
      window.dispatchEvent(
        new CustomEvent("shopping-list-stock-saved", {
          detail: {
            listId,
            itemId,
            currentStock: data?.currentStock ?? parsed,
            purchaseStatus: data?.purchaseStatus,
            reviewStatus: data?.reviewStatus ?? "REVISADO"
          }
        })
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setValue(lastSavedValueRef.current);
      if (inputRef.current) {
        inputRef.current.value = lastSavedValueRef.current;
      }
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la existencia actual.");
    }
  }

  function scheduleSave(nextValue: string) {
    setValue(nextValue);
    setStatus("idle");

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void saveCurrent(nextValue);
    }, 900);
  }

  return (
    <div className="auto-save-field">
      <input
        ref={inputRef}
        className={className}
        type="text"
        value={value}
        onInput={(event) => scheduleSave(event.currentTarget.value)}
        pattern="[0-9]*"
        aria-label={ariaLabel}
        inputMode="numeric"
        autoComplete="off"
      />
      <span className="muted auto-save-status">Sugerido: {calculateQuantityToBuy(Number(value || 0), minimumStock, maximumStock)}</span>
      <span className="muted auto-save-status">
        {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado" : status === "error" ? "Error al guardar" : null}
      </span>
      {errorMessage ? <span className="error" style={{ padding: "6px 8px", fontSize: 12 }}>{errorMessage}</span> : null}
    </div>
  );
}
