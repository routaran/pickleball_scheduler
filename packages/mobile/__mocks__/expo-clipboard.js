// Mock for expo-clipboard
module.exports = {
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
  getString: jest.fn(() => ''),
};
