import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    include: ['src/**/*.{test,test}.{js,jsx}', 'src/**/*.{spec,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/syncEngine.js', 'src/auditMigrationEngine.js', 'src/import/csvParser.js', 'src/import/fieldMatcher.js', 'src/import/rowValidator.js'],
    },
  },
});
