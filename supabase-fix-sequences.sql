-- ============================================================
-- FIX: Corrigir sequências de auto-increment desincronizadas
-- Execute este script INTEIRO no SQL Editor do Supabase
-- ============================================================
DO $$
BEGIN
  PERFORM setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));
  PERFORM setval(pg_get_serial_sequence('brands', 'id'), COALESCE((SELECT MAX(id) FROM brands), 1));
  PERFORM setval(pg_get_serial_sequence('sales', 'id'), COALESCE((SELECT MAX(id) FROM sales), 1));
  PERFORM setval(pg_get_serial_sequence('sale_items', 'id'), COALESCE((SELECT MAX(id) FROM sale_items), 1));
  PERFORM setval(pg_get_serial_sequence('subscriptions', 'id'), COALESCE((SELECT MAX(id) FROM subscriptions), 1));
  PERFORM setval(pg_get_serial_sequence('subscription_plans', 'id'), COALESCE((SELECT MAX(id) FROM subscription_plans), 1));
END $$;
