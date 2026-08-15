"use client";

import { useEffect, useState } from "react";
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY,
  readStoredCurrency,
  type Currency,
} from "@/lib/currency";
import { customEventDetail } from "@/types/events";

/**
 * Display currency from localStorage, kept in sync with header toggles.
 * Hydrates after mount — do not read localStorage in the useState initializer.
 */
export function useDisplayCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    setCurrency(readStoredCurrency());
    function onCurrency(event: Event) {
      const next = customEventDetail<Currency>(event);
      if (next) setCurrency(next);
    }
    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrency);
  }, []);

  return currency;
}
