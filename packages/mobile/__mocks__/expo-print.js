// Mock for expo-print
module.exports = {
  printAsync: jest.fn(() => Promise.resolve()),
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file://mock-pdf.pdf' })),
};
