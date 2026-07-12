import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createPlaceSchema, updatePlaceSchema } from './places.schema.js';
import * as service from './places.service.js';

/**
 * Valida `req.body` contra um schema zod. Em falha, lança 400 com detalhes.
 * (Mesmo padrão dos demais routers.)
 */
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => i.message).join('; '));
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return result.data;
}

/** Envolve um handler async e encaminha erros ao errorHandler. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Router de locais salvos (Fase G4, PLANO_GEOLOCALIZACAO.md). Toda rota é
 * protegida por requireAuth e opera exclusivamente sobre os locais do usuário
 * logado (isolamento por user_id) — não existe rota que exponha o local de um
 * usuário a outro usuário/role (seção 6 do plano).
 */
export function createPlacesRouter() {
  const router = Router();

  router.use(requireAuth);

  // GET /places → lista os locais do usuário → { places[] }
  router.get(
    '/',
    wrap(async (req, res) => {
      const result = await service.listPlaces(req.user.id);
      res.status(200).json(result);
    }),
  );

  // POST /places → cria um local → { place }
  router.post(
    '/',
    wrap(async (req, res) => {
      const data = validate(createPlaceSchema, req.body);
      const result = await service.createPlace(req.user.id, data);
      res.status(201).json(result);
    }),
  );

  // PATCH /places/:id → atualiza (só se for do usuário) → { place }
  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const data = validate(updatePlaceSchema, req.body);
      const result = await service.updatePlace(req.user.id, req.params.id, data);
      res.status(200).json(result);
    }),
  );

  // DELETE /places/:id → remove (só se for do usuário) → 204
  router.delete(
    '/:id',
    wrap(async (req, res) => {
      await service.deletePlace(req.user.id, req.params.id);
      res.status(204).end();
    }),
  );

  return router;
}

export default createPlacesRouter;
