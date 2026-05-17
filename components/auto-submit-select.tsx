"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
};

export function AutoSubmitSelect({ endpoint, name, defaultValue, className, ariaLabel, options, fieldName = name }: AutoSubmitSelectProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(defaultValue);

  return (
    <select
      name={name}
      value={value}
      className={className}
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
            body: JSON.stringify({ [fieldName]: nextStatus })
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "No se pudo guardar el estado.");
          }

          router.refresh();
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
