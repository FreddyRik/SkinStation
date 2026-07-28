-- Harden public API surface for Prisma-only apps (run in Supabase SQL Editor).
-- Safe to re-run.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

REVOKE ALL ON TABLE public."Profile" FROM anon, authenticated;
REVOKE ALL ON TABLE public."InventoryItem" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PriceCache" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PortfolioSnapshot" FROM anon, authenticated;
REVOKE ALL ON TABLE public."CatalogMeta" FROM anon, authenticated;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated;
