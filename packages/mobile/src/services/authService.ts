import { TokenStorage } from './tokenStorage';
import { RegistryService } from './registryService';
import { useAuthStore } from '../stores/authStore';
import { extractEmailFromToken } from '../utils/jwtUtils';
import { DUPRClient } from '@dupr/core';

export const AuthService = {
  /**
   * Initialize auth state from storage.
   * Call this on app startup to restore previous session.
   * @returns Token and user if found, null otherwise
   */
  async initialize(): Promise<{ token: string; user: { name: string; rating: number } | null } | null> {
    const token = await TokenStorage.getToken();
    const storedUser = await TokenStorage.getUser();

    if (!token) {
      console.log('[AuthService] No token found during initialization');
      return null;
    }

    // Set token in store
    useAuthStore.getState().setToken(token);

    // Set user in store if available
    let user: { name: string; rating: number } | null = null;
    if (storedUser) {
      user = { name: storedUser.name, rating: storedUser.rating ?? 0 };
      useAuthStore.getState().setUser(user);
    }

    console.log('[AuthService] Initialized with token and user');
    return { token, user };
  },

  /**
   * Logs out the user by clearing token/user from secure storage,
   * resetting the registry, and resetting auth state in the store.
   */
  async logout(): Promise<void> {
    // Clear token and user from secure storage
    await TokenStorage.clearAll();

    // Reset the player registry
    RegistryService.resetRegistry();

    // Reset auth state in Zustand store
    useAuthStore.getState().logout();

    console.log('[AuthService] Logged out, cleared token/user and reset registry');
  },

  /**
   * Performs login by saving token to secure storage,
   * using scraped user info or fetching from DUPR API, and updating auth state.
   * @param token - The JWT token
   * @param scrapedUserInfo - Optional user info scraped from the dashboard page
   */
  async login(token: string, scrapedUserInfo?: { name?: string; rating?: number }): Promise<void> {
    // 1. Save token first
    await TokenStorage.saveToken(token);
    useAuthStore.getState().setToken(token);

    // 2. Extract email from JWT
    const email = extractEmailFromToken(token);
    console.log(`[AuthService] Extracted email from JWT: ${email}`);

    // 3. If we have scraped user info with a name, use that directly
    if (scrapedUserInfo?.name) {
      console.log(`[AuthService] Using scraped user info: ${scrapedUserInfo.name} (${scrapedUserInfo.rating})`);

      await TokenStorage.saveUser({
        name: scrapedUserInfo.name,
        email: email || undefined,
        rating: scrapedUserInfo.rating ?? 0,
      });

      useAuthStore.getState().setUser({
        name: scrapedUserInfo.name,
        rating: scrapedUserInfo.rating ?? 0,
      });
      return;
    }

    // 4. Fallback: try to search DUPR API for user by email
    if (email) {
      try {
        const client = new DUPRClient(token);
        const players = await client.searchPlayers(email);

        if (players.length > 0) {
          const user = players[0];
          console.log(`[AuthService] Found user via API: ${user.fullName} (${user.bestRating})`);

          await TokenStorage.saveUser({
            name: user.fullName,
            email: email,
            duprId: user.duprId,
            rating: user.bestRating ?? 0,
          });

          useAuthStore.getState().setUser({
            name: user.fullName,
            rating: user.bestRating ?? 0,
          });
          return;
        }
      } catch (err) {
        console.warn('[AuthService] Failed to fetch user profile via API:', err);
      }

      // 5. Last resort: use email as name
      console.log('[AuthService] Using email as fallback name');
      await TokenStorage.saveUser({
        name: email,
        email: email,
        rating: scrapedUserInfo?.rating ?? 0,
      });
      useAuthStore.getState().setUser({
        name: email,
        rating: scrapedUserInfo?.rating ?? 0,
      });
    }
  },

  /**
   * Checks if user is currently authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    return await TokenStorage.hasToken();
  }
};
