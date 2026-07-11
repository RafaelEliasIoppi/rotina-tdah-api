import { z } from 'zod';

// Hora HH:MM (00:00 .. 23:59). Mesmo formato aceito pelo CHECK do banco.
const time = z
  .string()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'time deve estar no formato HH:MM (00:00-23:59)');

// weekday 1=seg .. 7=dom.
const weekday = z
  .number()
  .int('weekday deve ser inteiro')
  .min(1, 'weekday deve estar entre 1 e 7')
  .max(7, 'weekday deve estar entre 1 e 7');

// PUT /reminders {taskId, enabled, time, weekday, label?}
export const putReminderSchema = z.object({
  taskId: z.string().uuid('taskId deve ser um UUID'),
  enabled: z.boolean(),
  time,
  weekday,
  label: z.string().trim().min(1).max(200).optional(),
});
