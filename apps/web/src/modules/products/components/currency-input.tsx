"use client";

import { useEffect, useState } from "react";

export function parseCurrencyValue(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, "");
  const parts = cleaned.split(/[.,]/);
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  if (!cleaned || isNaN(Number(cleaned))) return "";
  return cleaned;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  required,
  id,
  name,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
}) {
  const [text, setText] = useState(() =>
    value
      ? Number(value).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "",
  );

  useEffect(() => {
    setText(
      value
        ? Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
    );
  }, [value]);

  const handleBlur = () => {
    const parsed = parseCurrencyValue(text);
    onChange(parsed);
    setText(
      parsed
        ? Number(parsed).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
    );
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
        R$
      </span>
      <input
        id={id}
        name={name}
        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface-strong pl-9 pr-3.5 text-sm text-foreground transition-all duration-[var(--transition-fast)] placeholder:text-muted hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        inputMode="decimal"
        onBlur={handleBlur}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={text}
      />
    </div>
  );
}
