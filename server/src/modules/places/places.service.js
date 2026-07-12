import * as repo from './places.repo.js';
import * as subscriptionsRepo from '../subscriptions/subscriptions.repo.js';

/** Limite de locais no plano grátis (seção 3/9 do plano de geolocalização). */
export const FREE_PLACES_LIMIT = 3;

/** Cria um erro com status HTTP e code para o errorHandler central. */
export function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

/**
 * Projeção pública de um local salvo no formato do cliente.
 * NUNCA expõe user_id — só o próprio dono acessa este recurso (seção 6 do plano:
 * nenhum endpoint expõe localização de um usuário para outro usuário/role).
 */
function toPublicPlace(row) {
  return {
    id: row.id,
    label: row.label,
    lat: Number(row.lat),
    lng: Number(row.lng),
    radius: row.radius,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Verifica se o usuário tem assinatura premium ativa (mesma checagem do requirePremium). */
async function isPremium(userId) {
  const sub = await subscriptionsRepo.findByUserId(userId);
  return !!sub && sub.plan === 'premium';
}

/** GET /places → lista os locais do usuário logado. */
export async function listPlaces(userId) {
  const rows = await repo.listByUserId(userId);
  return { places: rows.map(toPublicPlace) };
}

/**
 * POST /places → cria um local para o usuário logado.
 * Usuário free com FREE_PLACES_LIMIT locais ou mais → 403 (limite do plano grátis).
 */
export async function createPlace(userId, data) {
  const premium = await isPremium(userId);
  if (!premium) {
    const count = await repo.countByUserId(userId);
    if (count >= FREE_PLACES_LIMIT) {
      throw httpError(403, 'Limite de 3 locais no plano gratuito', 'PLACES_LIMIT_REACHED');
    }
  }
  const row = await repo.insert(userId, data);
  return { place: toPublicPlace(row) };
}

/**
 * PATCH /places/:id → atualiza campos, SOMENTE se o local é do usuário.
 * Não pertence / não existe → 404 (não 403, para não revelar existência).
 */
export async function updatePlace(userId, placeId, data) {
  const fields = {};
  if (data.label !== undefined) fields.label = data.label;
  if (data.lat !== undefined) fields.lat = data.lat;
  if (data.lng !== undefined) fields.lng = data.lng;
  if (data.radius !== undefined) fields.radius = data.radius;

  const row = await repo.updateForUser(placeId, userId, fields);
  if (!row) throw httpError(404, 'Local não encontrado', 'PLACE_NOT_FOUND');
  return { place: toPublicPlace(row) };
}

/**
 * DELETE /places/:id → remove, SOMENTE se o local é do usuário.
 * Não pertence / não existe → 404.
 */
export async function deletePlace(userId, placeId) {
  const ok = await repo.deleteForUser(placeId, userId);
  if (!ok) throw httpError(404, 'Local não encontrado', 'PLACE_NOT_FOUND');
}
