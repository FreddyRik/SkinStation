"use client";

import { useMemo } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  type Currency,
  writeStoredCurrency,
} from "@/lib/currency";
import type { SegmentedOption } from "@/types/ui";

export function CurrencyToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}) {
  const options = useMemo<SegmentedOption<Currency>[]>(
    () =>
      CURRENCIES.map((currency) => ({
        value: currency,
        label: currency,
        title: CURRENCY_LABELS[currency],
      })),
    [],
  );

  return (
    <SegmentedControl
      ariaLabel="Currency"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        writeStoredCurrency(next);
        onChange(next);
      }}
    />
  );
}
