-- Migration 0006 — corrige duplicação de tarefas na rotina e a torna
-- estruturalmente impossível daqui pra frente.
--
-- Causa raiz (investigada em 2026-07-12): PUT /routine/tasks (replaceTasks)
-- faz DELETE + INSERT em transação, mas duas chamadas concorrentes da MESMA
-- rotina (ex.: migração one-time disparando de duas sessões/dispositivos
-- logados na mesma conta ao mesmo tempo) podiam ambas passar pelo DELETE
-- antes de qualquer uma commitar seu INSERT, resultando em cada tarefa
-- inserida 2x. Sem uma constraint no banco, nada impedia isso.

-- 1) Remove duplicatas existentes, mantendo a linha mais antiga (created_at)
--    por (routine_id, weekday, time, label) — a assinatura lógica de uma
--    tarefa. completions/reminders que apontam para a linha removida são
--    apagados em cascata (FK ON DELETE CASCADE já existente), então isso
--    reatribui primeiro os vínculos para a linha sobrevivente antes de
--    apagar a duplicata, para não perder progresso/lembretes já salvos.
DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
BEGIN
  FOR dup IN
    SELECT routine_id, weekday, "time", label, array_agg(id ORDER BY created_at) AS ids
      FROM tasks
     GROUP BY routine_id, weekday, "time", label
    HAVING COUNT(*) > 1
  LOOP
    keep_id := dup.ids[1];
    -- Reatribui completions/reminders das duplicatas para a linha mantida
    -- (ON CONFLICT ignora se já existir o mesmo vínculo na linha mantida).
    UPDATE completions SET task_id = keep_id
     WHERE task_id = ANY(dup.ids[2:array_length(dup.ids,1)])
       AND NOT EXISTS (
         SELECT 1 FROM completions c2
          WHERE c2.task_id = keep_id AND c2.user_id = completions.user_id AND c2.done_date = completions.done_date
       );
    UPDATE reminders SET task_id = keep_id
     WHERE task_id = ANY(dup.ids[2:array_length(dup.ids,1)])
       AND NOT EXISTS (
         SELECT 1 FROM reminders r2
          WHERE r2.task_id = keep_id AND r2.user_id = reminders.user_id
       );
    DELETE FROM tasks WHERE id = ANY(dup.ids[2:array_length(dup.ids,1)]);
  END LOOP;
END $$;

-- 2) Impede a recorrência estruturalmente: nenhuma rotina pode ter duas
--    tarefas com a mesma assinatura lógica. Uma segunda chamada concorrente
--    de replaceTasks agora falha o INSERT duplicado em vez de silenciosamente
--    aceitar, o que o código já trata com ROLLBACK da transação inteira.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_routine_weekday_time_label
  ON tasks (routine_id, weekday, "time", label);
