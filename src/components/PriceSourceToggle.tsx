"use client";

import { useMemo } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  PRICE_SOURCES,
  PRICE_SOURCE_LABELS,
  type PriceSource,
  writeStoredPriceSource,
} from "@/lib/price-source";
import type { SegmentedOption } from "@/types/ui";

export function PriceSourceToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: PriceSource;
  onChange: (source: PriceSource) => void;
  disabled?: boolean;
}) {
  const options = useMemo<SegmentedOption<PriceSource>[]>(
    () =>
      PRICE_SOURCES.map((source) => ({
        value: source,
        label: source === "buff" ? "Buff" : "Steam",
        title: PRICE_SOURCE_LABELS[source],
      })),
    [],
  );

  return (
    <SegmentedControl
      ariaLabel="Price source"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        writeStoredPriceSource(next);
        onChange(next);
      }}
    />
  );
}
