/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Lets tests run without a prior build of the contracts package.
    '^@mixoraone/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    // NodeNext-style relative imports ('./x.js') resolve to their .ts sources
    // (used by the generated Prisma client).
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 15000,
};
