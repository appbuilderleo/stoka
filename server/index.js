import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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

      // TODO: Look up subscription by reference in your DB and mark it as active
      // Example:
      // await supabase
      //   .from('subscriptions')
      //   .update({ status: 'active', last_payment_date: new Date().toISOString().split('T')[0] })
      //   .eq('payment_reference', reference);
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

// ─── CREATE PAYMENT REQUEST ───────────────────────────────────────────────────
// Paysuite endpoint: POST https://paysuite.tech/api/v1/payments
// Returns: { status: 'success', data: { id, amount, reference, status, checkout_url } }
// We pass the checkout_url back to the frontend which then redirects the user.
// NOTE: 'method' is intentionally NOT sent in the payload so that Paysuite shows
// its hosted checkout page where the customer chooses MPesa, Emola, or Card.
app.post('/api/payments/paysuite/initiate', async (req, res) => {
  console.log('[Pay] Initiation request received:', req.body);
  try {
    const { amount, storeId, planId } = req.body;

    // Build a strictly alphanumeric reference — max 50 chars (Paysuite requirement)
    const shortStoreId = storeId ? storeId.split('-')[0] : 'store';
    const reference = `SUB${shortStoreId}${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);

    const payload = {
      amount: Number(amount),
      reference,
      description: `Assinatura KaziHub - Plano ${planId}`,
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

    // Forward Paysuite's response (including checkout_url) to the frontend
    res.status(200).json(response.data);

  } catch (error) {
    const errData = error.response?.data;
    console.error('[Pay] Paysuite API Error:', errData || error.message);
    res.status(error.response?.status || 500).json({ error: errData || 'Erro interno no servidor' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on port ${PORT}`);
});
