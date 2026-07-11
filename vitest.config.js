import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Roda antes dos módulos de teste para preparar env obrigatórias.
    setupFiles: ['./test/setup.js'],
    environment: 'node',
  },
});
