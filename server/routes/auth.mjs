import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.mjs';
import { verifyToken } from '../middleware/auth.mjs';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limite de 10 tentativas
  message: { error: 'Muitas tentativas de autenticação a partir deste IP. Por favor tente novamente mais tarde.' }
});

// REGISTO
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, fullName } = req.body;
  
  try {
    // 1. Check if email exists
    const userCheck = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email já está em uso.' });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create Profile as 'owner' with no store initially
    const profileRes = await pool.query(
      'INSERT INTO profiles (email, password_hash, full_name, store_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, store_id',
      [email, passwordHash, fullName, null, 'owner']
    );

    const user = profileRes.rows[0];

    // 4. Generate Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, store_id: user.store_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });

  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Erro ao registar utilizador: ' + error.message });
  }
});

// LOGIN
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, store_id: user.store_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send password hash back
    delete user.password_hash;
    res.json({ token, user });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Erro ao iniciar sessão: ' + error.message });
  }
});

// GET ME
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, store_id FROM profiles WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados do utilizador.' });
  }
});

export default router;
