"use client";

import { useEffect, useRef, useState } from "react";

type AutoSaveNumberFieldProps = {
  formId: string;
  name: string;
  defaultValue: number;
  min?: number;
  className?: string;
};

export function AutoSaveNumberField({ formId, name, defaultValue, min = 0, className }: AutoSaveNumberFieldProps) {
  const [value, setValue] = useState(String(defaultValue));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(String(defaultValue));
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function submitForm() {
    const form = document.getElementById(formId) as HTMLFormElement | null;

    if (!form) {
      return;
    }

    form.requestSubmit();
  }

  function scheduleSubmit(nextValue: string) {
    setValue(nextValue);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      submitForm();
    }, 450);
  }

  return (
    <input
      name={name}
      className={className}
      type="number"
      min={min}
      value={value}
      onChange={(event) => scheduleSubmit(event.target.value)}
      onBlur={submitForm}
      inputMode="numeric"
    />
  );
}
