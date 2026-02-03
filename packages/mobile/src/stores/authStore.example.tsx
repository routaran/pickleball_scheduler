/**
 * Example usage of the authStore in React components
 *
 * This file demonstrates how to use the useAuthStore hook
 * in various scenarios.
 */

import React from 'react';
import { useAuthStore } from './authStore';

/**
 * Example 1: Reading auth state
 */
export function AuthStatus() {
  const { token, user, isLoading, error } = useAuthStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!token) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <p>Rating: {user?.rating}</p>
    </div>
  );
}

/**
 * Example 2: Login flow
 */
export function LoginComponent() {
  const { setLoading, setToken, setUser, setError } = useAuthStore();

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      const response = await mockLoginAPI(username, password);

      setToken(response.token);
      setUser({
        name: response.user.name,
        rating: response.user.rating,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return <div>{/* Login form UI */}</div>;
}

/**
 * Example 3: Logout functionality
 */
export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    // Clear auth state
    logout();

    // Additional cleanup (e.g., clear secure storage, navigate to login)
    // TokenStorage.deleteToken();
    // navigation.navigate('Login');
  };

  return <button onClick={handleLogout}>Logout</button>;
}

/**
 * Example 4: Selecting specific state (optimized)
 */
export function UserRating() {
  // Only re-render when user rating changes
  const rating = useAuthStore((state) => state.user?.rating);

  return <div>Your rating: {rating ?? 'N/A'}</div>;
}

/**
 * Example 5: Using multiple actions
 */
export function AuthManager() {
  const { setToken, setUser, setError, setLoading } = useAuthStore();

  // You can use these actions anywhere in your component
  return null;
}

// Mock API for demonstration
async function mockLoginAPI(username: string, password: string) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (username === 'test' && password === 'password') {
    return {
      token: 'mock-token-123',
      user: {
        name: 'Test User',
        rating: 4.5,
      },
    };
  }

  throw new Error('Invalid credentials');
}
