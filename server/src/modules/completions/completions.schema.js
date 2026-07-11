import { z } from 'zod';

// Data no formato YYYY-MM-DD, validada como data real do calendário.
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Data inválida');

// GET /completions?from=&to= — ambos opcionais (default: últimos 30 dias).
export const listCompletionsQuerySchema = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
});

// PUT /completions {taskId, date, done}
export const putCompletionSchema = z.object({
  taskId: z.string().uuid('taskId deve ser um UUID'),
  date: dateStr,
  done: z.boolean(),
});
