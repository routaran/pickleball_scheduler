import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      token: null,
      user: null,
      isLoading: false,
      error: null,
    });
  });

  it('should export useAuthStore hook', () => {
    expect(useAuthStore).toBeDefined();
    expect(typeof useAuthStore).toBe('function');
  });

  it('should have initial state with null values', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('setToken', () => {
    it('should set token', () => {
      const { setToken } = useAuthStore.getState();
      setToken('test-token-123');

      const state = useAuthStore.getState();
      expect(state.token).toBe('test-token-123');
    });

    it('should clear error when setting token', () => {
      // Set an error first
      useAuthStore.setState({ error: 'Some error' });

      const { setToken } = useAuthStore.getState();
      setToken('test-token-123');

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      const { setUser } = useAuthStore.getState();
      const mockUser = { name: 'John Doe', rating: 4.5 };
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should allow null user', () => {
      // Set a user first
      useAuthStore.setState({ user: { name: 'John Doe', rating: 4.5 } });

      const { setUser } = useAuthStore.getState();
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { setError } = useAuthStore.getState();
      setError('Authentication failed');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Authentication failed');
    });

    it('should clear error when setting to null', () => {
      // Set an error first
      useAuthStore.setState({ error: 'Some error' });

      const { setError } = useAuthStore.getState();
      setError(null);

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      const { setLoading } = useAuthStore.getState();
      setLoading(true);

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      // Set loading to true first
      useAuthStore.setState({ isLoading: true });

      const { setLoading } = useAuthStore.getState();
      setLoading(false);

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      // Set up some state
      useAuthStore.setState({
        token: 'test-token',
        user: { name: 'John Doe', rating: 4.5 },
        error: 'Some error',
        isLoading: true,
      });

      const { logout } = useAuthStore.getState();
      logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
      // Note: isLoading is not reset by logout, only token, user, and error
      expect(state.isLoading).toBe(true);
    });

    it('should be idempotent - calling multiple times has same effect', () => {
      const { logout } = useAuthStore.getState();

      // Set up some state
      useAuthStore.setState({
        token: 'test-token',
        user: { name: 'John Doe', rating: 4.5 },
      });

      logout();
      const stateAfterFirstLogout = useAuthStore.getState();

      logout();
      const stateAfterSecondLogout = useAuthStore.getState();

      expect(stateAfterFirstLogout).toEqual(stateAfterSecondLogout);
    });
  });

  describe('integration - typical auth flow', () => {
    it('should handle full login flow', () => {
      const { setLoading, setToken, setUser, setError } = useAuthStore.getState();

      // Start loading
      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Set token (successful auth)
      setToken('auth-token-xyz');
      expect(useAuthStore.getState().token).toBe('auth-token-xyz');
      expect(useAuthStore.getState().error).toBeNull(); // error cleared

      // Set user info
      setUser({ name: 'Jane Smith', rating: 3.8 });
      expect(useAuthStore.getState().user).toEqual({ name: 'Jane Smith', rating: 3.8 });

      // Stop loading
      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      // Verify final state
      const finalState = useAuthStore.getState();
      expect(finalState).toMatchObject({
        token: 'auth-token-xyz',
        user: { name: 'Jane Smith', rating: 3.8 },
        isLoading: false,
        error: null,
      });
    });

    it('should handle failed login flow', () => {
      const { setLoading, setError } = useAuthStore.getState();

      // Start loading
      setLoading(true);

      // Authentication fails
      setError('Invalid credentials');

      // Stop loading
      setLoading(false);

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('should handle logout after successful login', () => {
      const { setToken, setUser, logout } = useAuthStore.getState();

      // Login
      setToken('auth-token');
      setUser({ name: 'Bob Johnson', rating: 4.2 });

      // Verify logged in
      expect(useAuthStore.getState().token).toBe('auth-token');
      expect(useAuthStore.getState().user).toEqual({ name: 'Bob Johnson', rating: 4.2 });

      // Logout
      logout();

      // Verify logged out
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
