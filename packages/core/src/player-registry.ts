/**
 * Player Registry Module
 * Caches player lookups to avoid repeated API calls for known players
 */

export interface RegisteredPlayer {
  /** Original search name used to find this player */
  searchName: string;
  /** DUPR system ID */
  duprId: string;
  /** Full name as shown in DUPR */
  duprName: string;
  /** Player's best rating (doubles preferred) */
  rating: number | null;
  /** Player's location from DUPR */
  location: string;
  /** When this player was registered */
  registeredAt: Date;
}

export interface RegistryData {
  [searchName: string]: {
    duprId: string;
    duprName: string;
    rating: number | null;
    location: string;
    registeredAt: string;
  };
}

export class PlayerRegistry {
  private registry: Map<string, RegisteredPlayer>;
  private filePath: string | null;

  /**
   * Create a new PlayerRegistry
   * @param filePath Optional path to JSON file for persistence
   */
  constructor(filePath?: string) {
    this.registry = new Map();
    this.filePath = filePath ?? null;
  }

  /**
   * Normalize a search name for consistent lookups
   * - Convert to lowercase
   * - Trim whitespace
   */
  private normalizeKey(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * Register a player in the cache
   * @param searchName The name used to search for this player
   * @param duprId DUPR system ID
   * @param duprName Full name from DUPR
   * @param rating Player's rating (null if not rated)
   * @param location Player's location
   */
  register(
    searchName: string,
    duprId: string,
    duprName: string,
    rating: number | null,
    location: string
  ): void {
    const key = this.normalizeKey(searchName);
    this.registry.set(key, {
      searchName,
      duprId,
      duprName,
      rating,
      location,
      registeredAt: new Date(),
    });
  }

  /**
   * Get a registered player by search name
   * @param searchName The name to look up
   * @returns RegisteredPlayer if found, undefined otherwise
   */
  get(searchName: string): RegisteredPlayer | undefined {
    const key = this.normalizeKey(searchName);
    return this.registry.get(key);
  }

  /**
   * Check if a player is registered
   * @param searchName The name to check
   * @returns true if player is registered
   */
  has(searchName: string): boolean {
    const key = this.normalizeKey(searchName);
    return this.registry.has(key);
  }

  /**
   * Remove a player from the registry
   * @param searchName The name to remove
   * @returns true if player was removed
   */
  delete(searchName: string): boolean {
    const key = this.normalizeKey(searchName);
    return this.registry.delete(key);
  }

  /**
   * Get all registered players
   * @returns Array of all registered players
   */
  getAll(): RegisteredPlayer[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get the number of registered players
   */
  get size(): number {
    return this.registry.size;
  }

  /**
   * Clear all registered players
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Convert registry to JSON-serializable format
   */
  toJSON(): RegistryData {
    const data: RegistryData = {};
    for (const [key, player] of this.registry) {
      data[key] = {
        duprId: player.duprId,
        duprName: player.duprName,
        rating: player.rating,
        location: player.location,
        registeredAt: player.registeredAt.toISOString(),
      };
    }
    return data;
  }

  /**
   * Load registry from JSON data
   * @param data Registry data object
   */
  fromJSON(data: RegistryData): void {
    this.registry.clear();
    for (const [key, value] of Object.entries(data)) {
      this.registry.set(key, {
        searchName: key,
        duprId: value.duprId,
        duprName: value.duprName,
        rating: value.rating,
        location: value.location,
        registeredAt: new Date(value.registeredAt),
      });
    }
  }

  /**
   * Save registry to file (Node.js environment)
   * Note: This is a no-op in browser environments
   */
  async save(): Promise<void> {
    if (!this.filePath) return;

    // Dynamic import for Node.js fs module
    try {
      const fs = await import('fs/promises');
      const data = JSON.stringify(this.toJSON(), null, 2);
      await fs.writeFile(this.filePath, data, 'utf-8');
    } catch (error) {
      // In browser or if fs not available, silently skip
      console.warn('Unable to save registry to file:', error);
    }
  }

  /**
   * Load registry from file (Node.js environment)
   * Note: This is a no-op in browser environments
   */
  async load(): Promise<void> {
    if (!this.filePath) return;

    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.filePath, 'utf-8');
      const json = JSON.parse(data) as RegistryData;
      this.fromJSON(json);
    } catch (error) {
      // File doesn't exist or can't be read - start with empty registry
      console.warn('Unable to load registry from file:', error);
    }
  }
}
