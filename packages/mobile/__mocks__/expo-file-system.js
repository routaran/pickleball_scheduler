// Mock for expo-file-system
module.exports = {
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  moveAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
};
