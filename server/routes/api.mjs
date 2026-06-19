import express from 'express';
import bcrypt from 'bcryptjs';
import { pool, getCachedOrFetch, cache } from '../db.mjs';
import { verifyToken } from '../middleware/auth.mjs';

const router = express.Router();

// ============================================================================
// Security Helpers
// ============================================================================
const checkStoreAccess = async (req, storeId) => {
  if (!storeId || storeId === 'null') return false;
  if (req.user.role === 'superadmin') return true;
  if (req.user.store_id === storeId) return true;
  const res = await pool.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
  if (res.rows.length > 0 && res.rows[0].owner_id === req.user.id) return true;
  return false;
};

// Security Helpers
router.use(verifyToken);

// ============================================================================
// STORES
// ============================================================================
router.get('/stores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stores ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROFILES
// ============================================================================
router.get('/profiles', async (req, res) => {
  try {
    const { store_id } = req.query;
    let queryText = 'SELECT p.id, p.email, p.full_name, p.role, p.store_id, p.created_at, s.name as store_name FROM profiles p LEFT JOIN stores s ON p.store_id = s.id';
    const params = [];
    
    if (store_id) {
      queryText += ' WHERE p.store_id = $1';
      params.push(store_id);
    } else if (req.user.role !== 'superadmin') {
      queryText += ' WHERE p.store_id IN (SELECT id FROM stores WHERE owner_id = $1) OR p.id = $1';
      params.push(req.user.id);
    }
    queryText += ' ORDER BY p.created_at DESC';
    
    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PRODUCTS
// ============================================================================
router.get('/products', async (req, res) => {
  try {
    const storeId = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });
    if (!storeId || storeId === 'null') return res.json([]);

    const cacheKey = `products_${storeId}`;
    
    const products = await getCachedOrFetch(cacheKey, async () => {
      // Pega os produtos apenas da loja
      const result = await pool.query(
        'SELECT * FROM products WHERE store_id = $1 ORDER BY name ASC',
        [storeId]
      );
      return result.rows;
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BRANDS
// ============================================================================
router.get('/brands', async (req, res) => {
  try {
    const storeId = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });
    if (!storeId || storeId === 'null') return res.json([]);

    const cacheKey = `brands_${storeId}`;
    
    const brands = await getCachedOrFetch(cacheKey, async () => {
      // JOIN with products to match Supabase's `*, products(id, name, icon)`
      const result = await pool.query(`
        SELECT b.*, 
               json_build_object('id', p.id, 'name', p.name, 'icon', p.icon) as products
        FROM brands b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.store_id = $1
        ORDER BY b.name ASC
      `, [storeId]);
      return result.rows;
    });

    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invalidate Cache Helper
const invalidateStoreCache = (storeId) => {
  cache.del(`products_${storeId}`);
  cache.del(`brands_${storeId}`);
  console.log(`[Cache] Invalidated cache for store ${storeId}`);
};

// ============================================================================
// SALES
// ============================================================================
router.post('/sales', async (req, res) => {
  const { total, payment_method, items, store_id } = req.body;
  const storeId = store_id || req.user.store_id;
  if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });

  try {
    await pool.query('BEGIN'); // Start Transaction

    // Insert Sale
    const saleResult = await pool.query(
      'INSERT INTO sales (store_id, profile_id, total, payment_method) VALUES ($1, $2, $3, $4) RETURNING id',
      [storeId, req.user.id, total, payment_method]
    );
    const saleId = saleResult.rows[0].id;

    // Insert Sale Items
    for (let item of items) {
      await pool.query(
        'INSERT INTO sale_items (sale_id, brand_id, store_id, quantity, price_at_time, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [saleId, item.brand_id, storeId, item.quantity, item.price, item.subtotal]
      );

      // Reduce Stock
      await pool.query(
        'UPDATE brands SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.brand_id]
      );
    }

    await pool.query('COMMIT');
    
    // Invalidar o cache de marcas porque o stock mudou
    invalidateStoreCache(storeId);
    
    res.status(201).json({ success: true, sale_id: saleId });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('[Sales] Transaction error:', error);
    res.status(500).json({ error: 'Erro ao processar venda' });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const storeId = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });
    const { start_date, end_date } = req.query;

    let queryText = `
      SELECT s.*, 
             p.full_name as profile_name,
             (
               SELECT json_agg(json_build_object(
                 'id', si.id,
                 'brand_id', si.brand_id,
                 'quantity', si.quantity,
                 'price_at_time', si.price_at_time,
                 'subtotal', si.subtotal,
                 'brands', (SELECT json_build_object('name', b.name, 'products', (SELECT json_build_object('name', pr.name) FROM products pr WHERE pr.id = b.product_id)) FROM brands b WHERE b.id = si.brand_id)
               ))
               FROM sale_items si WHERE si.sale_id = s.id
             ) as sale_items
      FROM sales s
      LEFT JOIN profiles p ON s.profile_id = p.id
      WHERE s.store_id = $1
    `;
    const params = [storeId];

    if (start_date && end_date) {
      queryText += ' AND s.created_at >= $2 AND s.created_at <= $3';
      params.push(start_date, end_date);
    }
    
    queryText += ' ORDER BY s.created_at DESC';

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================
router.get('/subscriptions', async (req, res) => {
  try {
    const storeId = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });
    if (!storeId || storeId === 'null') return res.json([]);

    let queryText = `
      SELECT s.*, 
             json_build_object('id', sp.id, 'name', sp.name, 'price', sp.price, 'max_users', sp.max_users) as subscription_plans
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.store_id = $1
      ORDER BY s.created_at DESC
    `;
    const params = [storeId];
    
    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /subscriptions (Upsert subscription for store)
// ============================================================================
router.post('/subscriptions', async (req, res) => {
  try {
    const { store_id, plan_id, amount_paid, months } = req.body;
    
    // Get store name
    const storeRes = await pool.query('SELECT name FROM stores WHERE id = $1', [store_id]);
    if (storeRes.rows.length === 0) return res.status(404).json({ error: 'Loja não encontrada' });
    const store_name = storeRes.rows[0].name;

    // Check if subscription exists
    const subRes = await pool.query('SELECT id FROM subscriptions WHERE store_id = $1', [store_id]);
    
    const next_billing_date = new Date();
    next_billing_date.setMonth(next_billing_date.getMonth() + months);

    let result;
    if (subRes.rows.length > 0) {
      result = await pool.query(
        'UPDATE subscriptions SET plan_id=$1, amount_paid=$2, next_billing_date=$3, status=$4 WHERE store_id=$5 RETURNING *',
        [plan_id, amount_paid, next_billing_date, 'active', store_id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO subscriptions (store_id, store_name, plan_id, amount_paid, next_billing_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [store_id, store_name, plan_id, amount_paid, next_billing_date, 'active']
      );
    }
    
    invalidateStoreCache(store_id);

    // Fetch with plan details
    const fullSubRes = await pool.query(`
      SELECT s.*, 
        json_build_object('id', sp.id, 'name', sp.name, 'price', sp.price, 'max_products', sp.max_products, 'max_users', sp.max_users, 'max_brands', sp.max_brands, 'has_reports', sp.has_reports) as subscription_plans 
      FROM subscriptions s 
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id 
      WHERE s.id = $1
    `, [result.rows[0].id]);
    
    res.json(fullSubRes.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST/PUT PRODUCTS & BRANDS
// ============================================================================
router.post('/products', async (req, res) => {
  try {
    const { name, icon, store_id } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, icon, store_id) VALUES ($1, $2, $3) RETURNING *',
      [name, icon, store_id]
    );
    invalidateStoreCache(store_id);
    res.status(201).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/brands', async (req, res) => {
  try {
    const { product_id, name, price, stock, store_id } = req.body;
    const result = await pool.query(
      'INSERT INTO brands (product_id, name, price, stock, store_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_id, name, price, stock, store_id]
    );
    invalidateStoreCache(store_id);
    
    // fetch the product details to match the select('*, products(...)') shape
    const brand = result.rows[0];
    const pRes = await pool.query('SELECT id, name, icon FROM products WHERE id = $1', [brand.product_id]);
    brand.products = pRes.rows[0];
    
    res.status(201).json([brand]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/brands/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, price } = req.body;
    const result = await pool.query(
      'UPDATE brands SET stock = $1, price = $2 WHERE id = $3 RETURNING *',
      [stock, price, id]
    );
    
    const brand = result.rows[0];
    const pRes = await pool.query('SELECT id, name, icon FROM products WHERE id = $1', [brand.product_id]);
    brand.products = pRes.rows[0];
    
    invalidateStoreCache(brand.store_id);
    res.json([brand]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PUT PROFILES & STORES
// ============================================================================
router.put('/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { store_id, role, full_name } = req.body;
    
    // Auth Check: Only superadmin or the user themselves (for some fields) or owner of the store can update profiles
    if (req.user.role !== 'superadmin') {
      if (req.user.id !== id) {
         // If they are not superadmin and not updating themselves, check if they own the store
         if (req.user.role === 'owner') {
           const pRes = await pool.query('SELECT store_id FROM profiles WHERE id = $1', [id]);
           if (!pRes.rows.length || pRes.rows[0].store_id !== req.user.store_id) {
             return res.status(403).json({ error: 'Não autorizado para editar este utilizador' });
           }
         } else {
           return res.status(403).json({ error: 'Não autorizado para editar este utilizador' });
         }
      }
      // Users cannot change their own role or store_id unless they are owners changing an employee
      if (req.user.id === id && (role !== undefined || store_id !== undefined)) {
        return res.status(403).json({ error: 'Não pode alterar o seu próprio cargo ou loja' });
      }
    }
    
    let query = 'UPDATE profiles SET ';
    const params = [];
    let paramIdx = 1;
    
    if (store_id !== undefined) {
      query += `store_id = $${paramIdx++}, `;
      params.push(store_id);
    }
    if (role !== undefined) {
      query += `role = $${paramIdx++}, `;
      params.push(role);
    }
    if (full_name !== undefined) {
      query += `full_name = $${paramIdx++}, `;
      params.push(full_name);
    }
    
    query = query.slice(0, -2); // remove comma
    query += ` WHERE id = $${paramIdx} RETURNING *`;
    params.push(id);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/my_profile', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    let query = 'UPDATE profiles SET ';
    const params = [];
    let paramIdx = 1;

    if (full_name !== undefined) {
      query += `full_name = $${paramIdx++}, `;
      params.push(full_name);
    }
    if (email !== undefined) {
      query += `email = $${paramIdx++}, `;
      params.push(email);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += `password_hash = $${paramIdx++}, `;
      params.push(passwordHash);
    }

    if (params.length === 0) return res.json({ success: true });

    query = query.slice(0, -2); // remove comma
    query += ` WHERE id = $${paramIdx} RETURNING *`;
    params.push(req.user.id);
    
    const result = await pool.query(query, params);
    
    // remove password_hash from response
    const user = result.rows[0];
    if (user) delete user.password_hash;
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my_stores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stores WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stores', async (req, res) => {
  try {
    const { name, nuit, address, phone, email, stock_low_threshold, stock_stable_threshold } = req.body;
    
    await pool.query('BEGIN');
    
    const result = await pool.query(
      'INSERT INTO stores (name, nuit, address, phone, email, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, nuit, address, phone, email, req.user.id]
    );
    const newStore = result.rows[0];

    // Create 14-day free trial of Básico plan (plan_id = 1)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 14);

    await pool.query(
      'INSERT INTO subscriptions (store_id, store_name, plan_id, status, payment_method, amount_paid, next_billing_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newStore.id, newStore.name, 1, 'active', 'trial_14_dias', 0, nextBillingDate]
    );
    
    await pool.query('COMMIT');

    res.status(201).json(newStore);
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

router.put('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nuit, address, phone, email, stock_low_threshold, stock_stable_threshold } = req.body;
    const result = await pool.query(
      'UPDATE stores SET name=$1, nuit=$2, address=$3, phone=$4, email=$5, stock_low_threshold=$6, stock_stable_threshold=$7 WHERE id=$8 RETURNING *',
      [name, nuit, address, phone, email, stock_low_threshold || 20, stock_stable_threshold || 50, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/subscription_plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DELETE PRODUCTS & BRANDS
// ============================================================================
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    const store_id = req.user.store_id;
    if (!(await checkStoreAccess(req, store_id))) return res.status(403).json({ error: 'Acesso negado à loja' });
    const result = await pool.query(
      'UPDATE products SET name = $1, icon = $2 WHERE id = $3 AND store_id = $4 RETURNING *',
      [name, icon, id, store_id]
    );
    invalidateStoreCache(store_id);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store_id = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, store_id))) return res.status(403).json({ error: 'Acesso negado à loja' });
    await pool.query('DELETE FROM products WHERE id = $1 AND store_id = $2', [id, store_id]);
    invalidateStoreCache(store_id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /products ERROR:', error);
    if (error.code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'Não é possível eliminar esta categoria porque contém itens que já possuem registo de vendas.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/brands/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store_id = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, store_id))) return res.status(403).json({ error: 'Acesso negado à loja' });
    await pool.query('DELETE FROM brands WHERE id = $1 AND store_id = $2', [id, store_id]);
    invalidateStoreCache(store_id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /brands ERROR:', error);
    if (error.code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'Não é possível eliminar este item porque já possui registo de vendas.' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
