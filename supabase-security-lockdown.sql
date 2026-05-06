-- ============================================================
-- SCRIPT DE SEGURANÇA KAZIHUB (RLS LOCKDOWN)
-- ============================================================

-- Adicionar store_id à tabela de itens se não existir
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Ativar RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DROP POLICY IF EXISTS "Users can only see their own profile" ON profiles;
CREATE POLICY "Users can only see their own profile" ON profiles FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can only see their own store" ON stores;
CREATE POLICY "Users can only see their own store" ON stores FOR ALL USING (id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see data from their store" ON products;
CREATE POLICY "Users can only see data from their store" ON products FOR ALL USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see data from their store" ON brands;
CREATE POLICY "Users can only see data from their store" ON brands FOR ALL USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see data from their store" ON sales;
CREATE POLICY "Users can only see data from their store" ON sales FOR ALL USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see data from their store" ON sale_items;
CREATE POLICY "Users can only see data from their store" ON sale_items FOR ALL USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can only see their own subscription" ON subscriptions;
CREATE POLICY "Users can only see their own subscription" ON subscriptions FOR ALL USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));
