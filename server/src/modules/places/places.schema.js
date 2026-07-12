import { z } from 'zod';

/**
 * Validação zod dos locais salvos (saved_places).
 * lat/lng seguem os limites geográficos válidos; radius em metros, positivo.
 * Raio fixo de 150m na v1 do app (seção 3 do plano), mas o backend aceita o
 * valor enviado — a UI hoje não expõe campo de raio configurável.
 */

const label = z.string().trim().min(1, 'label é obrigatório').max(200);
const lat = z
  .number({ invalid_type_error: 'lat deve ser número' })
  .min(-90, 'lat deve estar entre -90 e 90')
  .max(90, 'lat deve estar entre -90 e 90');
const lng = z
  .number({ invalid_type_error: 'lng deve ser número' })
  .min(-180, 'lng deve estar entre -180 e 180')
  .max(180, 'lng deve estar entre -180 e 180');
const radius = z
  .number({ invalid_type_error: 'radius deve ser número' })
  .int('radius deve ser inteiro')
  .positive('radius deve ser positivo');

/** POST /places — cria um local. */
export const createPlaceSchema = z.object({
  label,
  lat,
  lng,
  radius,
});

/** PATCH /places/:id — atualização parcial (ao menos um campo). */
export const updatePlaceSchema = z
  .object({
    label: label.optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    radius: radius.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });
