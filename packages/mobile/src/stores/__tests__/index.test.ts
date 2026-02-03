import { useAuthStore, useGameStore } from '../index';

describe('stores index exports', () => {
  it('should export useAuthStore', () => {
    expect(useAuthStore).toBeDefined();
    expect(typeof useAuthStore).toBe('function');
  });

  it('should export useGameStore', () => {
    expect(useGameStore).toBeDefined();
    expect(typeof useGameStore).toBe('function');
  });

  it('should allow importing both stores from index', () => {
    // Verify both stores are independent
    const authState = useAuthStore.getState();
    const gameState = useGameStore.getState();

    expect(authState).toBeDefined();
    expect(gameState).toBeDefined();
    expect(authState).not.toBe(gameState);
  });
});
