import { z } from 'zod';

/**
 * Validação zod dos envelopes de sync (Fase 4).
 *
 * - pull: { since?: ISO timestamp }
 * - push: { mutations: [ { entity, op, data, clientUpdatedAt } ] }
 *
 * O objetivo é rejeitar (400) qualquer envelope malformado ANTES de tocar o banco.
 * As validações de conteúdo de `data` são mínimas por entidade (o servidor ainda
 * aplica isolamento por usuário e LWW independentemente do que o cliente envia).
 */

// Timestamp ISO 8601 aceito pelo Date do JS (ex.: 2026-07-10T12:00:00.000Z).
const isoTimestamp = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'timestamp deve ser ISO 8601 válido');

// Data YYYY-MM-DD (para completions).
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date deve estar no formato YYYY-MM-DD');

const uuid = z.string().uuid('id deve ser um UUID');

// HH:MM 24h.
const time = z
  .string()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'time deve estar no formato HH:MM');

const weekday = z
  .number()
  .int('weekday deve ser inteiro')
  .min(1, 'weekday deve estar entre 1 e 7')
  .max(7, 'weekday deve estar entre 1 e 7');

/** POST /sync/pull — since opcional. */
export const pullSchema = z.object({
  since: isoTimestamp.optional(),
});

// ---- data por entidade ----------------------------------------------------

// task upsert: id obrigatório (o cliente gera UUID offline). Demais campos
// necessários no upsert.
const taskUpsertData = z.object({
  id: uuid,
  weekday,
  time,
  label: z.string().trim().min(1, 'label é obrigatório').max(200),
  block: z.string().trim().min(1, 'block é obrigatório').max(200),
  detail: z.string().max(2000).optional(),
  rule: z.string().max(2000).optional(),
  sortOrder: z.number().int().optional(),
});

const taskDeleteData = z.object({ id: uuid });

const completionUpsertData = z.object({
  taskId: uuid,
  date: dateStr,
});
const completionDeleteData = completionUpsertData;

const reminderUpsertData = z.object({
  taskId: uuid,
  weekday,
  time,
  enabled: z.boolean(),
  label: z.string().trim().min(1).max(200).nullable().optional(),
});
const reminderDeleteData = z.object({ taskId: uuid });

/**
 * Uma mutação. Validamos a forma do envelope e, condicionalmente, a forma de
 * `data` conforme (entity, op). Envelope inválido → o router traduz para 400.
 */
export const mutationSchema = z
  .object({
    entity: z.enum(['task', 'completion', 'reminder']),
    op: z.enum(['upsert', 'delete']),
    data: z.record(z.any()),
    clientUpdatedAt: isoTimestamp,
  })
  .superRefine((m, ctx) => {
    const pick = () => {
      if (m.entity === 'task') return m.op === 'upsert' ? taskUpsertData : taskDeleteData;
      if (m.entity === 'completion') {
        return m.op === 'upsert' ? completionUpsertData : completionDeleteData;
      }
      return m.op === 'upsert' ? reminderUpsertData : reminderDeleteData;
    };
    const result = pick().safeParse(m.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data', ...issue.path],
          message: `${m.entity}.${m.op}: ${issue.message}`,
        });
      }
    }
  });

/** POST /sync/push — lista ordenada de mutações. */
export const pushSchema = z.object({
  mutations: z.array(mutationSchema).max(1000, 'no máximo 1000 mutações por push'),
});
