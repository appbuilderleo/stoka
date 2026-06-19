const fs = require('fs');
let code = fs.readFileSync('server/routes/api.js', 'utf8');

// 1. Add checkStoreAccess function
const helperCode = `
// ============================================================================
// Security Helpers
// ============================================================================
const checkStoreAccess = async (req, storeId) => {
  if (!storeId || storeId === 'null') return false;
  if (req.user.role === 'superadmin') return true;
  if (req.user.store_id === storeId) return true;
  const { pool } = require('../db.js');
  const res = await pool.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
  if (res.rows.length > 0 && res.rows[0].owner_id === req.user.id) return true;
  return false;
};
`;
if (!code.includes('checkStoreAccess')) {
  code = code.replace(/const router = express\.Router\(\);\n/, 'const router = express.Router();\n' + helperCode);
}

// Replaces 'const storeId = req.query.store_id || req.user.store_id;' with auth check
code = code.replace(/const storeId = req\.query\.store_id \|\| req\.user\.store_id;/g, 
  `const storeId = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });`);

code = code.replace(/const store_id = req\.query\.store_id \|\| req\.user\.store_id;/g, 
  `const store_id = req.query.store_id || req.user.store_id;
    if (!(await checkStoreAccess(req, store_id))) return res.status(403).json({ error: 'Acesso negado à loja' });`);

code = code.replace(/const store_id = req\.user\.store_id;/g, 
  `const store_id = req.user.store_id;
    if (!(await checkStoreAccess(req, store_id))) return res.status(403).json({ error: 'Acesso negado à loja' });`);

// Fix sales POST
code = code.replace(/const storeId = store_id \|\| req\.user\.store_id;\n\n  try \{/g,
  `const storeId = store_id || req.user.store_id;
  if (!(await checkStoreAccess(req, storeId))) return res.status(403).json({ error: 'Acesso negado à loja' });

  try {`);

// 2. Fix PUT /stores/:id
// from: 
// const { name, nuit, address, phone, email, stock_low_threshold, stock_stable_threshold } = req.body;
// const result = await pool.query(
//   'UPDATE stores SET name=$1, nuit=$2, address=$3, phone=$4, email=$5, stock_low_threshold=$6, stock_stable_threshold=$7 WHERE id=$8 RETURNING *',
//   [name, nuit, address, phone, email, stock_low_threshold || 20, stock_stable_threshold || 50, id]
// );
code = code.replace(/UPDATE stores SET name=\\$1, nuit=\\$2, address=\\$3, phone=\\$4, email=\\$5, stock_low_threshold=\\$6, stock_stable_threshold=\\$7 WHERE id=\\$8 RETURNING \*/g, 
  `UPDATE stores SET name=$1, nuit=$2, address=$3, phone=$4, email=$5, stock_low_threshold=$6, stock_stable_threshold=$7 WHERE id=$8 AND owner_id=$9 RETURNING *`);

code = code.replace(/\[name, nuit, address, phone, email, stock_low_threshold \|\| 20, stock_stable_threshold \|\| 50, id\]/g, 
  `[name, nuit, address, phone, email, stock_low_threshold || 20, stock_stable_threshold || 50, id, req.user.id]`);

// 3. Fix PUT /profiles/:id
code = code.replace(/router\.put\('\/profiles\/:id', async \(req, res\) => \{[\s\S]*?const { store_id, role, full_name } = req\.body;/g,
  `router.put('/profiles/:id', async (req, res) => {
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
    }`);

fs.writeFileSync('server/routes/api.js', code);
console.log('Successfully patched api.js');
