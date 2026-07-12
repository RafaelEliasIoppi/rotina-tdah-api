import { z } from 'zod';

/**
 * Validação zod do módulo social (accountability partner + body doubling).
 */

/** POST /social/invite/accept — código de convite recebido de outro usuário. */
export const acceptInviteSchema = z.object({
  code: z.string().trim().min(1, 'code é obrigatório').max(64),
});
