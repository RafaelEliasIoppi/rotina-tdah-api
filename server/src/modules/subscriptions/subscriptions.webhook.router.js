import { Router } from 'express';
import * as service from './subscriptions.service.js';

const router = Router();

// Stripe exige body cru (raw) para verificar assinatura.
// Esta rota é montada ANTES do express.json() em app.js.
router.post('/stripe', async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'stripe-signature header ausente' });
    }
    const result = await service.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
