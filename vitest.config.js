import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* Die App wird pro Test selbst in einer jsdom-Instanz gebootet
       (siehe tests/hilfen/app.js), darum hier kein globales jsdom. */
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    reporters: ['default']
  }
});
