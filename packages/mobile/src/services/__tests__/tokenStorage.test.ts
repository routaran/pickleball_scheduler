// Mock expo-secure-store before importing
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { TokenStorage } from '../tokenStorage';

describe('TokenStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('saveToken', () => {
    it('should save token to SecureStore', async () => {
      const token = 'test-token-123';

      await TokenStorage.saveToken(token);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dupr_token', token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle long tokens', async () => {
      const longToken = 'a'.repeat(1000);

      await TokenStorage.saveToken(longToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dupr_token', longToken);
    });

    it('should handle special characters in token', async () => {
      const specialToken = 'token-with-special!@#$%^&*()_+-={}[]|:;"<>,.?/';

      await TokenStorage.saveToken(specialToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dupr_token', specialToken);
    });

    it('should propagate errors from SecureStore', async () => {
      const error = new Error('SecureStore error');
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(error);

      await expect(TokenStorage.saveToken('test-token')).rejects.toThrow('SecureStore error');
    });
  });

  describe('getToken', () => {
    it('should retrieve token from SecureStore', async () => {
      const token = 'test-token-123';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(token);

      const result = await TokenStorage.getToken();

      expect(result).toBe(token);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('dupr_token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    });

    it('should return null when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await TokenStorage.getToken();

      expect(result).toBeNull();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('dupr_token');
    });

    it('should propagate errors from SecureStore', async () => {
      const error = new Error('SecureStore read error');
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(error);

      await expect(TokenStorage.getToken()).rejects.toThrow('SecureStore read error');
    });
  });

  describe('deleteToken', () => {
    it('should delete token from SecureStore', async () => {
      await TokenStorage.deleteToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('dupr_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when deleting non-existent token', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(TokenStorage.deleteToken()).resolves.not.toThrow();
    });

    it('should propagate errors from SecureStore', async () => {
      const error = new Error('SecureStore delete error');
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(error);

      await expect(TokenStorage.deleteToken()).rejects.toThrow('SecureStore delete error');
    });
  });

  describe('hasToken', () => {
    it('should return true when token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('some-token');

      const result = await TokenStorage.hasToken();

      expect(result).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('dupr_token');
    });

    it('should return false when token is null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await TokenStorage.hasToken();

      expect(result).toBe(false);
    });

    it('should return false when token is undefined', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await TokenStorage.hasToken();

      expect(result).toBe(false);
    });

    it('should propagate errors from SecureStore', async () => {
      const error = new Error('SecureStore check error');
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(error);

      await expect(TokenStorage.hasToken()).rejects.toThrow('SecureStore check error');
    });
  });

  describe('Token lifecycle', () => {
    it('should handle complete token lifecycle (save -> get -> delete)', async () => {
      const token = 'lifecycle-token';

      // Save token
      await TokenStorage.saveToken(token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dupr_token', token);

      // Retrieve token
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(token);
      const retrieved = await TokenStorage.getToken();
      expect(retrieved).toBe(token);

      // Delete token
      await TokenStorage.deleteToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('dupr_token');

      // Verify token is gone
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const afterDelete = await TokenStorage.getToken();
      expect(afterDelete).toBeNull();
    });

    it('should handle token replacement (overwrite)', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';

      // Save old token
      await TokenStorage.saveToken(oldToken);

      // Save new token (should overwrite)
      await TokenStorage.saveToken(newToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith('dupr_token', newToken);
    });
  });

  describe('App restart simulation', () => {
    it('should persist token after app restart', async () => {
      const token = 'persistent-token';

      // Simulate save before restart
      await TokenStorage.saveToken(token);

      // Simulate app restart (clear mocks but keep stored data)
      jest.clearAllMocks();

      // Simulate retrieval after restart
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(token);
      const retrieved = await TokenStorage.getToken();

      expect(retrieved).toBe(token);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('dupr_token');
    });

    it('should return false for hasToken when no token was saved before restart', async () => {
      // Simulate app restart with no previous token
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const hasToken = await TokenStorage.hasToken();

      expect(hasToken).toBe(false);
    });
  });

  describe('Security considerations', () => {
    it('should use SecureStore (not AsyncStorage) for token storage', async () => {
      const token = 'secure-token';

      await TokenStorage.saveToken(token);

      // Verify it's using SecureStore methods
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should use consistent key for all operations', async () => {
      const token = 'test-token';
      const expectedKey = 'dupr_token';

      await TokenStorage.saveToken(token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expectedKey, expect.any(String));

      await TokenStorage.getToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(expectedKey);

      await TokenStorage.deleteToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(expectedKey);

      await TokenStorage.hasToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(expectedKey);
    });
  });
});
