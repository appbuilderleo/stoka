-- ============================================================
-- MIGRAÇÃO MULTI-TENANT: Cada proprietário vê apenas a SUA loja
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar store_id às tabelas existentes
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- 2. Desativar RLS nas novas tabelas (para desenvolvimento)
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Atualizar o Trigger para criar automaticamente uma Loja + Perfil no registo
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  new_store_id UUID;
BEGIN
  -- Primeiro cria a Loja automaticamente
  INSERT INTO public.stores (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'name', 'Minha Loja'))
  RETURNING id INTO new_store_id;

  -- Depois cria o Perfil e vincula à Loja
  INSERT INTO public.profiles (id, full_name, role, store_id)
  VALUES (new.id, new.raw_user_meta_data->>'name', 'owner', new_store_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reassociar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
