module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files pattern
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Setup files
  setupFiles: ['dotenv/config'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Stop running tests after first failure
  bail: false,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    'node_modules',
    'coverage'
  ],

  // Transform files
  transform: {},

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Test environment variables
  testEnvironmentVariables: {
    NODE_ENV: 'test'
  },

  // Global setup
  globalSetup: undefined,

  // Global teardown
  globalTeardown: undefined,

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ]
};