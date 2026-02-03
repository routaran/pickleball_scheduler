module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@dupr/core$': '<rootDir>/../core/src/index.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^react-native-webview$': '<rootDir>/__mocks__/react-native-webview.js',
    '^expo-clipboard$': '<rootDir>/__mocks__/expo-clipboard.js',
    '^expo-sharing$': '<rootDir>/__mocks__/expo-sharing.js',
    '^expo-print$': '<rootDir>/__mocks__/expo-print.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^@sentry/react-native$': '<rootDir>/__mocks__/@sentry/react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
