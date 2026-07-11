// Setup carregado ANTES de qualquer módulo de teste/aplicação.
// Garante as variáveis de ambiente obrigatórias sem depender de um .env real.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.PORT ||= '3000';
// Segredos obrigatórios a partir da Fase 1 (valores fixos só para teste).
process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-0123456789abcdef';
// Testes de auth assumem Google OAuth não configurado por padrão.
// dotenv (chamado depois, ao importar env.js) só define vars ausentes de
// process.env — string vazia aqui bloqueia um .env real com essas chaves
// preenchidas, e env.js trata "" como não configurado (checagem !valor).
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_ANDROID_CLIENT_ID = '';
