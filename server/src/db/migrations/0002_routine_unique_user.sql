-- Migration 0002 — garante 1 rotina por usuário no MVP.
-- Previne duplicação silenciosa (ex.: duas chamadas concorrentes de createRoutine).
-- Se no futuro o produto permitir múltiplas rotinas por usuário, esta constraint é removida.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_routines_user_id ON routines(user_id);
