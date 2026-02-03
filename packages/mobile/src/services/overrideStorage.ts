/**
 * Player Override Storage Service
 * Manages player overrides in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// Types
// =============================================================================

export interface PlayerOverride {
  searchName: string; // Name user types (lowercase for consistency)
  duprId: string; // DUPR player ID to use
  displayName: string; // Display name from DUPR
  rating: number; // Override rating
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = '@dupr_player_overrides';

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Get all player overrides
 */
export async function getOverrides(): Promise<PlayerOverride[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return [];
    }
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to load overrides:', error);
    return [];
  }
}

/**
 * Save a player override
 * If an override with the same searchName exists, it will be replaced
 */
export async function saveOverride(override: PlayerOverride): Promise<void> {
  try {
    const overrides = await getOverrides();

    // Remove any existing override with the same searchName (case-insensitive)
    const filtered = overrides.filter(
      (o) => o.searchName.toLowerCase() !== override.searchName.toLowerCase()
    );

    // Add new override with lowercase searchName for consistency
    filtered.push({
      ...override,
      searchName: override.searchName.toLowerCase(),
    });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save override:', error);
    throw new Error('Failed to save override');
  }
}

/**
 * Delete a player override by searchName
 */
export async function deleteOverride(searchName: string): Promise<void> {
  try {
    const overrides = await getOverrides();
    const filtered = overrides.filter(
      (o) => o.searchName.toLowerCase() !== searchName.toLowerCase()
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete override:', error);
    throw new Error('Failed to delete override');
  }
}

/**
 * Clear all overrides (for testing or reset)
 */
export async function clearOverrides(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear overrides:', error);
    throw new Error('Failed to clear overrides');
  }
}
