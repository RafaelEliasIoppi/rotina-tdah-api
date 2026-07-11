ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text NULL,
  ADD COLUMN IF NOT EXISTS plan_id               text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end  boolean NOT NULL DEFAULT false;

-- Já existe coluna plan, mas renomeamos a semântica: plan = 'free'|'premium'
-- plan_id = id do preço no Stripe (price_xxx)
-- Mantemos plan para consulta rápida no backend
