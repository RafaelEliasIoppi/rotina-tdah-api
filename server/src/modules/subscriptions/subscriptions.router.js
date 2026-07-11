import { Router } from 'express';
import * as service from './subscriptions.service.js';
import { createCheckoutSchema } from './subscriptions.schema.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();

router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const { priceId, successUrl, cancelUrl } = createCheckoutSchema.parse(req.body);
    const result = await service.createCheckoutSession(
      req.user.id,
      req.user.email,
      priceId,
      successUrl,
      cancelUrl,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const sub = await service.getSubscription(req.user.id);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const result = await service.createPortalSession(req.user.id, returnUrl);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
