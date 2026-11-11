/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^foodie-shared-rn$': '<rootDir>/packages/shared-rn/src/index.ts',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
  clearMocks: true,
};
