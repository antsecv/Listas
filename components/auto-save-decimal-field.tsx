"use client";

import { useEffect, useRef, useState } from "react";

type AutoSaveDecimalFieldProps = {
  endpoint: string;
  fieldName: string;
  defaultValue: number | null;
  className?: string;
  ariaLabel: string;
  inputMode?: "decimal" | "numeric";
  step?: string;
  allowEmpty?: boolean;
  eventName?: string;
  eventDetail?: Record<string, unknown>;
};

export function AutoSaveDecimalField({
  endpoint,
  fieldName,
  defaultValue,
  className,
  ariaLabel,
  inputMode = "decimal",
  step = "0.01",
  allowEmpty = true,
  eventName,
  eventDetail
}: AutoSaveDecimalFieldProps) {
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
      if (!allowEmpty) {
        setStatus("error");
        setErrorMessage("Debes indicar un valor.");
        return;
      }

      const requestId = ++requestIdRef.current;
      setStatus("saving");
      setErrorMessage(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [fieldName]: null })
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "No se pudo guardar el valor.");
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        lastSavedValueRef.current = "";
        setStatus("saved");
        setErrorMessage(null);
        if (eventName) {
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: {
                ...(eventDetail ?? {}),
                [fieldName]: null
              }
            })
          );
        }
        return;
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setValue(lastSavedValueRef.current);
        if (inputRef.current) {
          inputRef.current.value = lastSavedValueRef.current;
        }
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el valor.");
        return;
      }
    }

    const normalized = raw.replace(",", ".");
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      setStatus("error");
      setErrorMessage("El valor debe ser un decimal no negativo.");
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
        body: JSON.stringify({ [fieldName]: parsed })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo guardar el valor.");
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      lastSavedValueRef.current = String(parsed);
      setStatus("saved");
      setErrorMessage(null);
      if (eventName) {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ...(eventDetail ?? {}),
              [fieldName]: parsed
            }
          })
        );
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setValue(lastSavedValueRef.current);
      if (inputRef.current) {
        inputRef.current.value = lastSavedValueRef.current;
      }
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el valor.");
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
        aria-label={ariaLabel}
        inputMode={inputMode}
        autoComplete="off"
      />
      <span className="muted auto-save-status">
        {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado" : status === "error" ? "Error al guardar" : null}
      </span>
      {errorMessage ? <span className="error" style={{ padding: "6px 8px", fontSize: 12 }}>{errorMessage}</span> : null}
    </div>
  );
}
