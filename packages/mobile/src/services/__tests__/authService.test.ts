import { AuthService } from '../authService';
import { TokenStorage } from '../tokenStorage';
import { useAuthStore } from '../../stores/authStore';

// Mock dependencies
jest.mock('../tokenStorage', () => ({
  TokenStorage: {
    saveToken: jest.fn(),
    deleteToken: jest.fn(),
    getToken: jest.fn(),
    hasToken: jest.fn(),
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should clear token from secure storage', async () => {
      const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockLogout = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        logout: mockLogout,
      });

      await AuthService.logout();

      expect(mockDeleteToken).toHaveBeenCalledTimes(1);
    });

    it('should reset auth state in store', async () => {
      const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockLogout = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        logout: mockLogout,
      });

      await AuthService.logout();

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should clear storage before resetting state', async () => {
      const callOrder: string[] = [];

      const mockDeleteToken = jest.fn().mockImplementation(async () => {
        callOrder.push('deleteToken');
      });
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockLogout = jest.fn().mockImplementation(() => {
        callOrder.push('logout');
      });
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        logout: mockLogout,
      });

      await AuthService.logout();

      expect(callOrder).toEqual(['deleteToken', 'logout']);
    });

    it('should handle storage deletion errors gracefully', async () => {
      const mockDeleteToken = jest.fn().mockRejectedValue(new Error('Storage error'));
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockLogout = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        logout: mockLogout,
      });

      await expect(AuthService.logout()).rejects.toThrow('Storage error');
      expect(mockDeleteToken).toHaveBeenCalledTimes(1);
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should save token to secure storage', async () => {
      const mockSaveToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      const testToken = 'test-token-123';
      await AuthService.login(testToken);

      expect(mockSaveToken).toHaveBeenCalledTimes(1);
      expect(mockSaveToken).toHaveBeenCalledWith(testToken);
    });

    it('should update auth state with token', async () => {
      const mockSaveToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      const testToken = 'test-token-456';
      await AuthService.login(testToken);

      expect(mockSetToken).toHaveBeenCalledTimes(1);
      expect(mockSetToken).toHaveBeenCalledWith(testToken);
    });

    it('should save token before updating state', async () => {
      const callOrder: string[] = [];

      const mockSaveToken = jest.fn().mockImplementation(async () => {
        callOrder.push('saveToken');
      });
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn().mockImplementation(() => {
        callOrder.push('setToken');
      });
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      await AuthService.login('test-token');

      expect(callOrder).toEqual(['saveToken', 'setToken']);
    });

    it('should handle storage save errors gracefully', async () => {
      const mockSaveToken = jest.fn().mockRejectedValue(new Error('Storage error'));
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      await expect(AuthService.login('test-token')).rejects.toThrow('Storage error');
      expect(mockSaveToken).toHaveBeenCalledTimes(1);
      expect(mockSetToken).not.toHaveBeenCalled();
    });

    it('should handle empty token', async () => {
      const mockSaveToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      await AuthService.login('');

      expect(mockSaveToken).toHaveBeenCalledWith('');
      expect(mockSetToken).toHaveBeenCalledWith('');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', async () => {
      const mockHasToken = jest.fn().mockResolvedValue(true);
      (TokenStorage.hasToken as jest.Mock) = mockHasToken;

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);
      expect(mockHasToken).toHaveBeenCalledTimes(1);
    });

    it('should return false when no token exists', async () => {
      const mockHasToken = jest.fn().mockResolvedValue(false);
      (TokenStorage.hasToken as jest.Mock) = mockHasToken;

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);
      expect(mockHasToken).toHaveBeenCalledTimes(1);
    });

    it('should handle storage check errors', async () => {
      const mockHasToken = jest.fn().mockRejectedValue(new Error('Storage error'));
      (TokenStorage.hasToken as jest.Mock) = mockHasToken;

      await expect(AuthService.isAuthenticated()).rejects.toThrow('Storage error');
      expect(mockHasToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration tests', () => {
    it('should complete login-logout cycle', async () => {
      const mockSaveToken = jest.fn().mockResolvedValue(undefined);
      const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockSetToken = jest.fn();
      const mockLogout = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
        logout: mockLogout,
      });

      // Login
      await AuthService.login('test-token');
      expect(mockSaveToken).toHaveBeenCalledWith('test-token');
      expect(mockSetToken).toHaveBeenCalledWith('test-token');

      // Logout
      await AuthService.logout();
      expect(mockDeleteToken).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple login attempts', async () => {
      const mockSaveToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.saveToken as jest.Mock) = mockSaveToken;

      const mockSetToken = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        setToken: mockSetToken,
      });

      await AuthService.login('token-1');
      await AuthService.login('token-2');
      await AuthService.login('token-3');

      expect(mockSaveToken).toHaveBeenCalledTimes(3);
      expect(mockSaveToken).toHaveBeenNthCalledWith(1, 'token-1');
      expect(mockSaveToken).toHaveBeenNthCalledWith(2, 'token-2');
      expect(mockSaveToken).toHaveBeenNthCalledWith(3, 'token-3');
    });

    it('should handle multiple logout attempts', async () => {
      const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
      (TokenStorage.deleteToken as jest.Mock) = mockDeleteToken;

      const mockLogout = jest.fn();
      (useAuthStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        logout: mockLogout,
      });

      await AuthService.logout();
      await AuthService.logout();
      await AuthService.logout();

      expect(mockDeleteToken).toHaveBeenCalledTimes(3);
      expect(mockLogout).toHaveBeenCalledTimes(3);
    });
  });
});
