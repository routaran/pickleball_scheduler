import { PlayerRegistry } from '@dupr/core';

/**
 * Singleton Registry Manager
 * Manages a shared PlayerRegistry instance across the mobile app
 */

let registryInstance: PlayerRegistry | null = null;

export const RegistryService = {
  /**
   * Get the shared PlayerRegistry instance.
   * Creates a new instance if one doesn't exist.
   * @returns The shared PlayerRegistry instance
   */
  getRegistry(): PlayerRegistry {
    if (!registryInstance) {
      console.log('[RegistryService] Creating new PlayerRegistry instance');
      registryInstance = new PlayerRegistry();
    }
    return registryInstance;
  },

  /**
   * Clear the cache on the existing registry.
   * Removes all registered players but keeps the same instance.
   */
  clearRegistry(): void {
    if (registryInstance) {
      console.log('[RegistryService] Clearing registry cache');
      registryInstance.clear();
    } else {
      console.log('[RegistryService] No registry instance to clear');
    }
  },

  /**
   * Reset the registry by creating a new empty instance.
   * Use this for logout to ensure a fresh state.
   */
  resetRegistry(): void {
    console.log('[RegistryService] Resetting registry (creating new instance)');
    registryInstance = new PlayerRegistry();
  },
};
