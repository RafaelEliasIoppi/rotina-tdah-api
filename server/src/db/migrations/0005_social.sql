-- Migration 0005 — accountability partner (par único) e body doubling
-- assíncrono (contagem agregada de "em bloco de foco agora").
--
-- Accountability partner: par único por usuário (não grupo), ativado por
-- convite via código curto. Compartilha só nome + streak/progresso do dia
-- de hoje — nunca a rotina detalhada do parceiro (privacidade: dado
-- agregado, não a lista de tarefas em si).
--
-- Body doubling: heartbeat leve (sem histórico) de sessões de foco ativas
-- agora, para contagem agregada ("N pessoas em bloco de foco agora").
-- Nenhum dado identifica outro usuário nesse recurso — só um contador.

CREATE TABLE IF NOT EXISTS accountability_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  from_user  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_accountability_invites_code ON accountability_invites(code);
CREATE INDEX IF NOT EXISTS idx_accountability_invites_from_user ON accountability_invites(from_user);

-- Par único: cada linha representa uma amizade de responsabilização
-- (user_a, user_b), sempre com user_a < user_b para evitar duplicidade
-- (a, b) vs (b, a). Desfazer o par é DELETE, não soft-delete.
CREATE TABLE IF NOT EXISTS accountability_pairs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accountability_pairs_order CHECK (user_a < user_b),
  CONSTRAINT accountability_pairs_unique UNIQUE (user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_accountability_pairs_user_a ON accountability_pairs(user_a);
CREATE INDEX IF NOT EXISTS idx_accountability_pairs_user_b ON accountability_pairs(user_b);

-- Heartbeat de sessão de foco (Pomodoro) ativa — linha única por usuário,
-- sobrescrita a cada heartbeat. Sem histórico: expira sozinha (checagem por
-- updated_at recente na query, não precisa de job de limpeza para o MVP).
CREATE TABLE IF NOT EXISTS focus_sessions (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
