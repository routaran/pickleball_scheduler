import * as SecureStore from 'expo-secure-store';

export interface StoredUser {
  name: string;
  email?: string;
  duprId?: string;
  rating?: number;
}

const TOKEN_KEY = 'dupr_token';
const USER_KEY = 'dupr_user';

export const TokenStorage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async deleteToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async hasToken(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token !== null && token !== undefined;
  },

  async saveUser(user: StoredUser): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<StoredUser | null> {
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson) as StoredUser;
  },

  async deleteUser(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
};
