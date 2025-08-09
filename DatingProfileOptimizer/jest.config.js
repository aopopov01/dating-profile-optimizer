module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/testing/setup/jest.setup.js',
    '<rootDir>/testing/setup/performance.setup.js'
  ],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/testing/**/*.test.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.mock.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/security/': {
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@stripe/stripe-react-native|react-native-vector-icons|react-native-paper)/)'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@testing/(.*)$': '<rootDir>/testing/$1',
    '^@mocks/(.*)$': '<rootDir>/testing/mocks/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 30000, // 30 seconds for integration tests
  verbose: true,
  maxWorkers: 4,
  testResultsProcessor: '<rootDir>/testing/reports/jest-results-processor.js',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './testing/reports/junit',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: './testing/reports/html',
      filename: 'test-report.html',
      expand: true
    }]
  ]
};
