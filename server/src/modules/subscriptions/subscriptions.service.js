import Stripe from 'stripe';
import { env } from '../../config/env.js';
import * as repo from './subscriptions.repo.js';

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(userId, userEmail, priceId, successUrl, cancelUrl) {
  const stripe = getStripe();
  if (!stripe) {
    const err = new Error('Stripe não configurado');
    err.status = 501;
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
    client_reference_id: userId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
  });

  return { url: session.url, sessionId: session.id };
}

export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe não configurado');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const e = new Error('Assinatura do webhook inválida');
    e.status = 400;
    e.code = 'WEBHOOK_SIGNATURE_INVALID';
    throw e;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.userId || session.client_reference_id;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await repo.upsert(userId, {
          plan: 'premium',
          status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_id: subscription.items.data[0]?.price?.id || '',
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const plan = subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free';
        await repo.upsert(userId, {
          plan,
          status: subscription.status,
          stripe_subscription_id: subscription.id,
          plan_id: subscription.items.data[0]?.price?.id || '',
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
      }
      break;
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        if (userId) {
          const plan = subscription.status === 'active' ? 'premium' : 'free';
          await repo.upsert(userId, {
            plan,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
          });
        }
      }
      break;
    }
  }

  return { received: true };
}

export async function getSubscription(userId) {
  try {
    const sub = await repo.findByUserId(userId);
    return sub || { plan: 'free', status: 'active' };
  } catch {
    return { plan: 'free', status: 'active' };
  }
}

export async function createPortalSession(userId, returnUrl) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe não configurado');

  const sub = await repo.findByUserId(userId);
  if (!sub?.stripe_customer_id) {
    const err = new Error('Nenhuma assinatura ativa');
    err.status = 404;
    err.code = 'NO_SUBSCRIPTION';
    throw err;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });

  return { url: session.url };
}
