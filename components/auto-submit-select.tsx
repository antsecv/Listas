"use client";

import { useState } from "react";
import { getPurchaseStatusClass, getShoppingListStatusClass } from "@/lib/shopping";
import type { PurchaseStatus, ShoppingListStatus } from "@/lib/shopping";

type Option = {
  value: string;
  label: string;
};

type AutoSubmitSelectProps = {
  endpoint: string;
  name: string;
  defaultValue: string;
  className?: string;
  ariaLabel: string;
  options: Option[];
  fieldName?: string;
  statusKind?: "shopping-list" | "purchase";
  eventName?: string;
  eventDetail?: Record<string, unknown>;
};

function getStatusClassName(kind: AutoSubmitSelectProps["statusKind"], value: string) {
  if (kind === "purchase") {
    return getPurchaseStatusClass(value as PurchaseStatus);
  }

  return getShoppingListStatusClass(value as ShoppingListStatus);
}

export function AutoSubmitSelect({ endpoint, name, defaultValue, className, ariaLabel, options, fieldName = name, statusKind, eventName, eventDetail }: AutoSubmitSelectProps) {
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(defaultValue);

  return (
    <select
      name={name}
      value={value}
      className={[className, statusKind ? getStatusClassName(statusKind, value) : null].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      disabled={saving}
      onChange={async (event) => {
        const nextStatus = event.currentTarget.value;
        const previousStatus = value;
        setValue(nextStatus);
        setSaving(true);

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ [fieldName]: nextStatus })
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "No se pudo guardar el estado.");
          }

          const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

          if (eventName) {
            window.dispatchEvent(
              new CustomEvent(eventName, {
                detail: {
                  ...(eventDetail ?? {}),
                  ...(data ?? {}),
                  [fieldName]: nextStatus
                }
              })
            );
          }
        } catch (error) {
          setValue(previousStatus);
          alert(error instanceof Error ? error.message : "No se pudo guardar el estado.");
        } finally {
          setSaving(false);
        }
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
