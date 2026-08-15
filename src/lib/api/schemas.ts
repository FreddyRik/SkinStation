import { z } from "zod";
import { CURRENCIES } from "@/lib/currency";
import { isWellFormedInspectLink } from "@/lib/inspect/links";
import { RECENT_PROFILES_LIMIT } from "@/lib/recent-profiles";
import { isSteamAssetId, isSteamId64 } from "@/lib/steam/steamid";

/** Prisma cuid() ids — alphanumeric, bounded to reject junk / injection probes. */
export const profileIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9]+$/, "Invalid profile id.");

export const steamId64Schema = z
  .string()
  .trim()
  .refine(isSteamId64, "Invalid SteamID64.");

export const steamAssetIdSchema = z
  .string()
  .trim()
  .refine(isSteamAssetId, "Invalid asset id.");

export const inspectLinkSchema = z
  .string()
  .trim()
  .min(24)
  .max(4096)
  .refine(isWellFormedInspectLink, "Invalid CS2 inspect link.");

export const steamInputSchema = z
  .string()
  .trim()
  .min(1, "Steam profile URL or SteamID64 is required.")
  .max(256, "Steam profile input is too long.");

export const currencySchema = z.enum(CURRENCIES);

export const syncRequestSchema = z
  .object({
    profileId: profileIdSchema.optional(),
    input: steamInputSchema.optional(),
    force: z.boolean().optional(),
    currency: currencySchema.optional(),
  })
  .strict()
  .refine((body) => Boolean(body.profileId || body.input), {
    message: "profileId or input is required.",
    path: ["profileId"],
  });

export const profileCreateRequestSchema = z
  .object({
    input: steamInputSchema,
  })
  .strict();

export const profileIdsQuerySchema = z
  .string()
  .trim()
  .max(RECENT_PROFILES_LIMIT * 72)
  .transform((raw) => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const part of raw.split(",")) {
      const parsed = profileIdSchema.safeParse(part.trim());
      if (!parsed.success) continue;
      if (seen.has(parsed.data)) continue;
      seen.add(parsed.data);
      ids.push(parsed.data);
      if (ids.length >= RECENT_PROFILES_LIMIT) break;
    }
    return ids;
  });

export const imageProxyUrlSchema = z
  .string()
  .trim()
  .min(8)
  .max(2048)
  .url("Invalid url.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Invalid url.");

export const fxResponseSchema = z.object({
  usdToEur: z.number().finite().gt(0.5).lt(2),
  eurToUsd: z.number().finite().gt(0.5).lt(2).optional(),
});

export const apiErrorSchema = z.object({
  error: z.string().trim().min(1).max(400),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type ProfileCreateRequest = z.infer<typeof profileCreateRequestSchema>;
export type FxResponse = z.infer<typeof fxResponseSchema>;
