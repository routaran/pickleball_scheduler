// Mock for @sentry/react-native
module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setExtras: jest.fn(),
  addBreadcrumb: jest.fn(),
  SeverityLevel: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Log: 'log',
    Info: 'info',
    Debug: 'debug',
  },
};
