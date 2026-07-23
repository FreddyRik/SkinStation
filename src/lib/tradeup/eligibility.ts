import {
  contractSlotCount,
  detectMarketVariant,
  isTradeUpInputTier,
  nextTier,
  type TradeUpTier,
} from "@/lib/tradeup/rarity";
import type {
  TradeUpCatalogSkin,
  TradeUpInput,
  TradeUpVariant,
} from "@/lib/tradeup/types";
import {
  buildWeightedOutcomes,
  groupKeyForInput,
  type TradeUpPoolContext,
} from "@/lib/tradeup/outcomes";

export type ValidatedContract = {
  inputTier: TradeUpTier;
  outputTier: TradeUpTier;
  slotCount: number;
  variant: TradeUpVariant;
  resolved: Array<{
    input: TradeUpInput;
    skin: TradeUpCatalogSkin;
    groupKey: string;
  }>;
};

export function validateTradeUpContract(
  inputs: TradeUpInput[],
  skinsById: Map<string, TradeUpCatalogSkin>,
  ctx: TradeUpPoolContext,
): { ok: true; contract: ValidatedContract } | { ok: false; error: string } {
  if (inputs.length === 0) {
    return { ok: false, error: "Add skins to the contract to see results." };
  }

  const resolved: ValidatedContract["resolved"] = [];
  let lockedTier: TradeUpTier | null = null;
  let lockedVariant: TradeUpVariant | null = null;

  for (const input of inputs) {
    const skin = skinsById.get(input.skinId);
    if (!skin) {
      return {
        ok: false,
        error: `Could not resolve skin for “${input.displayName ?? input.skinId}”.`,
      };
    }
    if (!isTradeUpInputTier(skin.rarityTier)) {
      return {
        ok: false,
        error: "Knives and gloves cannot be used as trade-up inputs.",
      };
    }
    if (
      !Number.isFinite(skin.minFloat) ||
      !Number.isFinite(skin.maxFloat) ||
      skin.maxFloat <= skin.minFloat
    ) {
      return {
        ok: false,
        error: `“${skin.name}” is missing float bounds.`,
      };
    }
    if (!Number.isFinite(input.floatValue)) {
      return {
        ok: false,
        error: `“${skin.name}” needs a float value.`,
      };
    }

    // Variant from market hash when present; otherwise assume normal
    // (sandbox selections set variant via locked contract state).
    let slotVariant: TradeUpVariant = "normal";
    if (input.marketHashName) {
      const detected = detectMarketVariant(input.marketHashName).variant;
      if (detected === "souvenir") {
        slotVariant = "normal"; // souvenir attribute stripped
      } else if (detected === "stattrak") {
        slotVariant = "stattrak";
      }
    }

    if (lockedTier == null) lockedTier = skin.rarityTier;
    if (skin.rarityTier !== lockedTier) {
      return {
        ok: false,
        error: "All inputs must share the same rarity.",
      };
    }

    if (lockedVariant == null) lockedVariant = slotVariant;
    // When marketHashName is absent (sandbox), trust the first locked variant
    // passed via consistent costs — caller should set marketHashName or we
    // infer from a contract-level variant. Re-check below after loop using
    // optional contractVariant on inputs via cost path... handled in compute.

    const groupKey = groupKeyForInput(skin.rarityTier, skin, ctx);
    if (!groupKey) {
      return {
        ok: false,
        error:
          skin.rarityTier === "covert"
            ? `“${skin.name}” has no case with knife/glove drops.`
            : `“${skin.name}” has no trade-up collection.`,
      };
    }

    resolved.push({ input, skin, groupKey });
  }

  if (!lockedTier || !lockedVariant) {
    return { ok: false, error: "Could not determine contract rarity." };
  }

  // Re-evaluate variants when market hashes are missing: treat as normal
  // unless every input was marked StatTrak via marketHashName on at least one.
  // For sandbox, computeTradeUp passes explicit variant.
  const slotCount = contractSlotCount(lockedTier);
  if (resolved.length !== slotCount) {
    return {
      ok: false,
      error:
        lockedTier === "covert"
          ? `Covert → knife/glove contracts need exactly ${slotCount} skins (currently ${resolved.length}).`
          : `This contract needs exactly ${slotCount} skins (currently ${resolved.length}).`,
    };
  }

  const output = nextTier(lockedTier);
  if (!output) {
    return { ok: false, error: "This rarity cannot be traded up further." };
  }

  // Verify pool is non-empty
  const candidates = buildWeightedOutcomes({
    inputTier: lockedTier,
    variant: lockedVariant,
    groupKeys: resolved.map((r) => r.groupKey),
    ctx,
  });
  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        lockedTier === "covert" && lockedVariant === "stattrak"
          ? "No StatTrak knife outcomes for these cases (gloves have no StatTrak)."
          : "No possible outcomes for this contract.",
    };
  }

  return {
    ok: true,
    contract: {
      inputTier: lockedTier,
      outputTier: output,
      slotCount,
      variant: lockedVariant,
      resolved,
    },
  };
}

/** Variant-aware validation for sandbox (no market hashes). */
export function validateTradeUpContractWithVariant(
  inputs: TradeUpInput[],
  skinsById: Map<string, TradeUpCatalogSkin>,
  ctx: TradeUpPoolContext,
  variant: TradeUpVariant,
): { ok: true; contract: ValidatedContract } | { ok: false; error: string } {
  // Temporarily stamp market hashes so validate can detect ST.
  const stamped = inputs.map((input) => {
    if (input.marketHashName) return input;
    const skin = skinsById.get(input.skinId);
    const base = skin?.baseName ?? "Skin";
    const hash =
      variant === "stattrak" ? `StatTrak™ ${base} (Field-Tested)` : `${base} (Field-Tested)`;
    return { ...input, marketHashName: hash };
  });
  return validateTradeUpContract(stamped, skinsById, ctx);
}
