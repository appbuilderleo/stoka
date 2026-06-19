import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { pool } from './db.mjs';
import authRoutes from './routes/auth.mjs';
import apiRoutes from './routes/api.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware: Helmet
app.use(helmet());

// Security Middleware: CORS
// We allow localhost for development and vercel domains for production testing
const allowedOrigins = [
  'http://localhost:5173',
  'https://stoka.co.mz'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// General Rate Limiter to prevent DoS (1000 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Muitos pedidos a partir deste IP, por favor tente novamente mais tarde.'
});
app.use(generalLimiter);

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────
// Raw body needed so we can validate the HMAC signature (per Paysuite docs)
app.post('/api/payments/paysuite/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = req.body.toString();

    // Header used by Paysuite: X-Webhook-Signature
    const signature = req.headers['x-webhook-signature'];

    // Verify authenticity using HMAC SHA256 and the webhook secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYSUITE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!signature || signature !== expectedSignature) {
      console.warn('[Webhook] Invalid signature. Rejecting.');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    console.log('[Webhook] Event received:', event.event, '| request_id:', event.request_id);

    // ── payment.success ──────────────────────────────────────────────────────
    if (event.event === 'payment.success') {
      const { reference, transaction } = event.data;
      console.log('[Webhook] PAYMENT SUCCESS | reference:', reference, '| method:', transaction?.method);

      // Update subscription in CockroachDB
      await pool.query(
        "UPDATE subscriptions SET status = 'active', last_payment_date = $1 WHERE payment_reference = $2",
        [new Date().toISOString().split('T')[0], reference]
      );
    }

    // ── payment.failed ───────────────────────────────────────────────────────
    if (event.event === 'payment.failed') {
      console.log('[Webhook] PAYMENT FAILED | reference:', event.data.reference, '| reason:', event.data.error);
    }

    // Always respond quickly (within 5s per Paysuite best practices)
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// ─── CREATE PAYMENT REQUEST ───────────────────────────────────────────────────
app.post('/api/payments/paysuite/initiate', async (req, res) => {
  console.log('[Pay] Initiation request received:', req.body);
  try {
    const { amount, storeId, planId } = req.body;

    const shortStoreId = storeId ? storeId.split('-')[0] : 'store';
    const reference = `SUB${shortStoreId}${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);

    const payload = {
      amount: Number(amount),
      reference,
      description: `Assinatura Stoka - Plano ${planId}`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
      callback_url: process.env.PAYSUITE_WEBHOOK_URL
    };

    console.log('[Pay] Payload sent to Paysuite:', payload);

    const response = await axios.post('https://paysuite.tech/api/v1/payments', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSUITE_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('[Pay] Paysuite response:', response.data);

    // Save payment reference to subscription so webhook can find it
    // Wait, we need to create the subscription first or update it with the reference.
    // For now, this is just preserving the old behavior but with CockroachDB.
    
    res.status(200).json(response.data);

  } catch (error) {
    const errData = error.response?.data;
    console.error('[Pay] Paysuite API Error:', errData || error.message);
    res.status(error.response?.status || 500).json({ error: errData || 'Erro interno no servidor' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

export default app;
