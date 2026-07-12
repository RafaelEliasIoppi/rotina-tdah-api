-- Migration 0004 — locais salvos pelo usuário (Fase G4, PLANO_GEOLOCALIZACAO.md).
-- Dado de CONFIGURAÇÃO (cadastrado manualmente pelo usuário), não dado de rastreamento:
-- não existe e não deve existir aqui nenhum histórico de "onde o usuário esteve".
CREATE TABLE IF NOT EXISTS saved_places (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      text NOT NULL,
  lat        double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng        double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  radius     int NOT NULL DEFAULT 150 CHECK (radius > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);
