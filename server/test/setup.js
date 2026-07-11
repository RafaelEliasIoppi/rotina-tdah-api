// Setup carregado ANTES de qualquer módulo de teste/aplicação.
// Garante as variáveis de ambiente obrigatórias sem depender de um .env real.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.PORT ||= '3000';
// Segredos obrigatórios a partir da Fase 1 (valores fixos só para teste).
process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';
