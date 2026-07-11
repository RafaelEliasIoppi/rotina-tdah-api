import { z } from 'zod';

/**
 * Validação zod das tarefas de rotina.
 * weekday 1-7 (1=seg..7=dom), time no formato HH:MM, label e block obrigatórios,
 * detail/rule/sortOrder opcionais. Espelha o CHECK da migration 0001_init.sql.
 */

const weekday = z
  .number({ invalid_type_error: 'weekday deve ser número' })
  .int('weekday deve ser inteiro')
  .min(1, 'weekday deve estar entre 1 e 7')
  .max(7, 'weekday deve estar entre 1 e 7');

// HH:MM 24h — mesma regex do CHECK no banco.
const time = z
  .string()
  .regex(/^[0-2][0-9]:[0-5][0-9]$/, 'time deve estar no formato HH:MM');

const label = z.string().trim().min(1, 'label é obrigatório').max(200);
const block = z.string().trim().min(1, 'block é obrigatório').max(200);
const detail = z.string().max(2000).optional();
const rule = z.string().max(2000).optional();
const sortOrder = z.number().int('sortOrder deve ser inteiro').optional();

/** Uma tarefa completa (para criação / substituição). */
export const taskSchema = z.object({
  weekday,
  time,
  label,
  block,
  detail,
  rule,
  sortOrder,
});

/** PUT /routine/tasks — substitui todo o conjunto. */
export const replaceTasksSchema = z.object({
  tasks: z.array(taskSchema),
});

/** POST /routine/tasks — cria uma tarefa. Aceita {task} ou o corpo direto. */
export const createTaskSchema = z.object({
  task: taskSchema,
});

/** PATCH /routine/tasks/:id — atualização parcial (ao menos um campo). */
export const updateTaskSchema = z
  .object({
    weekday: weekday.optional(),
    time: time.optional(),
    label: label.optional(),
    block: block.optional(),
    detail,
    rule,
    sortOrder,
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });
