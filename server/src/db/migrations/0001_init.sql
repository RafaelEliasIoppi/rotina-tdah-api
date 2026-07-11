-- Migration 0001 — schema inicial (seção 3 do plano).
-- Extensões: pgcrypto para gen_random_uuid(), citext para email case-insensitive.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ==== users ====
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NULL,
  google_sub    text UNIQUE NULL,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ==== routines (1 por usuário no MVP) ====
CREATE TABLE IF NOT EXISTS routines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Minha rotina',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);

-- ==== tasks ====
CREATE TABLE IF NOT EXISTS tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  weekday    smallint CHECK (weekday BETWEEN 1 AND 7), -- 1=seg .. 7=dom
  "time"     text CHECK ("time" ~ '^[0-2][0-9]:[0-5][0-9]$'),
  label      text NOT NULL,
  block      text NOT NULL,
  detail     text NOT NULL DEFAULT '',
  rule       text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_routine_weekday ON tasks(routine_id, weekday);

-- ==== completions ====
CREATE TABLE IF NOT EXISTS completions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  done_date  date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, done_date)
);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON completions(user_id, done_date);

-- ==== reminders ====
CREATE TABLE IF NOT EXISTS reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  weekday    smallint CHECK (weekday BETWEEN 1 AND 7),
  "time"     text CHECK ("time" ~ '^[0-2][0-9]:[0-5][0-9]$'),
  label      text,
  enabled    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

-- ==== refresh_tokens ====
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ==== subscriptions (preparação p/ cobrança futura; não usada no MVP) ====
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan                text NOT NULL DEFAULT 'free',
  status              text NOT NULL DEFAULT 'active',
  current_period_end  timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
