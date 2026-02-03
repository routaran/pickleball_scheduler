import { PlayerRegistry, RegisteredPlayer, RegistryData } from '../player-registry';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('PlayerRegistry', () => {
  let registry: PlayerRegistry;

  beforeEach(() => {
    registry = new PlayerRegistry();
  });

  describe('register and get', () => {
    it('should register and retrieve a player', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton, AB');

      const player = registry.get('John Smith');
      expect(player).toBeDefined();
      expect(player?.duprId).toBe('ABC123');
      expect(player?.duprName).toBe('John A. Smith');
      expect(player?.rating).toBe(4.25);
      expect(player?.location).toBe('Edmonton, AB');
    });

    it('should return undefined for non-existent player', () => {
      const player = registry.get('Unknown Player');
      expect(player).toBeUndefined();
    });

    it('should overwrite on re-registration', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      registry.register('John Smith', 'DEF456', 'John B. Smith', 4.50, 'Calgary');

      const player = registry.get('John Smith');
      expect(player?.duprId).toBe('DEF456');
      expect(player?.rating).toBe(4.50);
    });

    it('should store searchName correctly', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const player = registry.get('John Smith');
      expect(player?.searchName).toBe('John Smith');
    });

    it('should set registeredAt date', () => {
      const beforeRegister = new Date();
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      const afterRegister = new Date();

      const player = registry.get('John Smith');
      expect(player?.registeredAt).toBeInstanceOf(Date);
      expect(player?.registeredAt.getTime()).toBeGreaterThanOrEqual(beforeRegister.getTime());
      expect(player?.registeredAt.getTime()).toBeLessThanOrEqual(afterRegister.getTime());
    });
  });

  describe('case insensitivity', () => {
    it('should find player regardless of case', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      expect(registry.get('john smith')).toBeDefined();
      expect(registry.get('JOHN SMITH')).toBeDefined();
      expect(registry.get('John SMITH')).toBeDefined();
    });

    it('should register as "John Smith" and get as "john smith"', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const player = registry.get('john smith');
      expect(player).toBeDefined();
      expect(player?.duprId).toBe('ABC123');
    });

    it('should register as "JOHN SMITH" and get as "John Smith"', () => {
      registry.register('JOHN SMITH', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const player = registry.get('John Smith');
      expect(player).toBeDefined();
      expect(player?.duprId).toBe('ABC123');
    });

    it('should handle whitespace trimming', () => {
      registry.register('  John Smith  ', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      expect(registry.get('John Smith')).toBeDefined();
      expect(registry.get('  John Smith')).toBeDefined();
      expect(registry.get('John Smith  ')).toBeDefined();
    });
  });

  describe('has', () => {
    it('should return true for registered player', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      expect(registry.has('John Smith')).toBe(true);
    });

    it('should return false for non-existent player', () => {
      expect(registry.has('Unknown')).toBe(false);
    });

    it('should be case insensitive', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      expect(registry.has('john smith')).toBe(true);
      expect(registry.has('JOHN SMITH')).toBe(true);
      expect(registry.has('John SMITH')).toBe(true);
    });
  });

  describe('delete', () => {
    it('should remove player and return true', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const result = registry.delete('John Smith');
      expect(result).toBe(true);
      expect(registry.get('John Smith')).toBeUndefined();
    });

    it('should return false for non-existent player', () => {
      expect(registry.delete('Unknown')).toBe(false);
    });

    it('should be case insensitive', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const result = registry.delete('JOHN SMITH');
      expect(result).toBe(true);
      expect(registry.get('John Smith')).toBeUndefined();
    });

    it('should confirm player is gone after delete', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      registry.delete('John Smith');

      expect(registry.has('John Smith')).toBe(false);
      expect(registry.get('John Smith')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array initially', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered players', () => {
      registry.register('John', 'A', 'John', 4.0, 'City');
      registry.register('Jane', 'B', 'Jane', 3.5, 'Town');

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should return players with correct data', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      registry.register('Jane Doe', 'DEF456', 'Jane B. Doe', 3.75, 'Calgary');

      const all = registry.getAll();
      const john = all.find(p => p.searchName === 'John Smith');
      const jane = all.find(p => p.searchName === 'Jane Doe');

      expect(john).toBeDefined();
      expect(john?.duprId).toBe('ABC123');
      expect(jane).toBeDefined();
      expect(jane?.duprId).toBe('DEF456');
    });
  });

  describe('size', () => {
    it('should be 0 initially', () => {
      expect(registry.size).toBe(0);
    });

    it('should track count correctly', () => {
      expect(registry.size).toBe(0);

      registry.register('John', 'A', 'John', 4.0, 'City');
      expect(registry.size).toBe(1);

      registry.register('Jane', 'B', 'Jane', 3.5, 'Town');
      expect(registry.size).toBe(2);

      registry.delete('John');
      expect(registry.size).toBe(1);
    });

    it('should increase with registrations', () => {
      registry.register('Player1', 'A', 'Player1', 4.0, 'City');
      expect(registry.size).toBe(1);

      registry.register('Player2', 'B', 'Player2', 4.0, 'City');
      expect(registry.size).toBe(2);

      registry.register('Player3', 'C', 'Player3', 4.0, 'City');
      expect(registry.size).toBe(3);
    });

    it('should decrease with deletions', () => {
      registry.register('Player1', 'A', 'Player1', 4.0, 'City');
      registry.register('Player2', 'B', 'Player2', 4.0, 'City');
      registry.register('Player3', 'C', 'Player3', 4.0, 'City');
      expect(registry.size).toBe(3);

      registry.delete('Player1');
      expect(registry.size).toBe(2);

      registry.delete('Player2');
      expect(registry.size).toBe(1);
    });

    it('should not increase on re-registration of same player', () => {
      registry.register('John', 'A', 'John', 4.0, 'City');
      expect(registry.size).toBe(1);

      registry.register('John', 'B', 'John Updated', 4.5, 'New City');
      expect(registry.size).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all players', () => {
      registry.register('John', 'A', 'John', 4.0, 'City');
      registry.register('Jane', 'B', 'Jane', 3.5, 'Town');

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it('should make size become 0', () => {
      registry.register('John', 'A', 'John', 4.0, 'City');
      registry.register('Jane', 'B', 'Jane', 3.5, 'Town');
      registry.register('Bob', 'C', 'Bob', 4.0, 'Village');

      expect(registry.size).toBe(3);

      registry.clear();

      expect(registry.size).toBe(0);
    });

    it('should allow new registrations after clear', () => {
      registry.register('John', 'A', 'John', 4.0, 'City');
      registry.clear();

      registry.register('Jane', 'B', 'Jane', 3.5, 'Town');

      expect(registry.size).toBe(1);
      expect(registry.get('Jane')).toBeDefined();
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const json = registry.toJSON();

      const newRegistry = new PlayerRegistry();
      newRegistry.fromJSON(json);

      const player = newRegistry.get('John Smith');
      expect(player?.duprId).toBe('ABC123');
      expect(player?.rating).toBe(4.25);
    });

    it('should handle null ratings', () => {
      registry.register('New Player', 'XYZ', 'New Player', null, 'Location');

      const json = registry.toJSON();
      const newRegistry = new PlayerRegistry();
      newRegistry.fromJSON(json);

      expect(newRegistry.get('New Player')?.rating).toBeNull();
    });

    it('should round-trip preserve all data', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      registry.register('Jane Doe', 'DEF456', 'Jane B. Doe', 3.75, 'Calgary');

      const json = registry.toJSON();
      const newRegistry = new PlayerRegistry();
      newRegistry.fromJSON(json);

      expect(newRegistry.size).toBe(2);

      const john = newRegistry.get('John Smith');
      expect(john?.duprId).toBe('ABC123');
      expect(john?.duprName).toBe('John A. Smith');
      expect(john?.rating).toBe(4.25);
      expect(john?.location).toBe('Edmonton');

      const jane = newRegistry.get('Jane Doe');
      expect(jane?.duprId).toBe('DEF456');
      expect(jane?.duprName).toBe('Jane B. Doe');
      expect(jane?.rating).toBe(3.75);
      expect(jane?.location).toBe('Calgary');
    });

    it('should convert dates correctly', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const json = registry.toJSON();

      // Check that date is serialized as ISO string
      const key = Object.keys(json)[0];
      expect(typeof json[key].registeredAt).toBe('string');
      expect(json[key].registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Deserialize and check date is restored
      const newRegistry = new PlayerRegistry();
      newRegistry.fromJSON(json);

      const player = newRegistry.get('John Smith');
      expect(player?.registeredAt).toBeInstanceOf(Date);
    });

    it('should produce valid JSON structure', () => {
      registry.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      const json = registry.toJSON();

      expect(json).toHaveProperty('john smith');
      expect(json['john smith']).toHaveProperty('duprId', 'ABC123');
      expect(json['john smith']).toHaveProperty('duprName', 'John A. Smith');
      expect(json['john smith']).toHaveProperty('rating', 4.25);
      expect(json['john smith']).toHaveProperty('location', 'Edmonton');
      expect(json['john smith']).toHaveProperty('registeredAt');
    });

    it('should clear existing data when loading from JSON', () => {
      registry.register('Existing', 'OLD', 'Existing Player', 3.0, 'Old City');

      const newData: RegistryData = {
        'new player': {
          duprId: 'NEW123',
          duprName: 'New Player',
          rating: 4.0,
          location: 'New City',
          registeredAt: new Date().toISOString(),
        },
      };

      registry.fromJSON(newData);

      expect(registry.size).toBe(1);
      expect(registry.get('Existing')).toBeUndefined();
      expect(registry.get('New Player')).toBeDefined();
    });

    it('should handle empty registry', () => {
      const json = registry.toJSON();
      expect(json).toEqual({});

      const newRegistry = new PlayerRegistry();
      newRegistry.fromJSON(json);
      expect(newRegistry.size).toBe(0);
    });
  });

  describe('constructor', () => {
    it('should create empty registry without filePath', () => {
      const reg = new PlayerRegistry();
      expect(reg.size).toBe(0);
    });

    it('should create empty registry with filePath', () => {
      const reg = new PlayerRegistry('/path/to/file.json');
      expect(reg.size).toBe(0);
    });
  });

  describe('save and load', () => {
    let tempDir: string;
    let tempFile: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'player-registry-test-'));
      tempFile = path.join(tempDir, 'registry.json');
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should handle save when no filePath is set', async () => {
      const reg = new PlayerRegistry();
      reg.register('John', 'A', 'John', 4.0, 'City');

      // Should not throw
      await expect(reg.save()).resolves.toBeUndefined();
    });

    it('should handle load when no filePath is set', async () => {
      const reg = new PlayerRegistry();

      // Should not throw
      await expect(reg.load()).resolves.toBeUndefined();
    });

    it('should save registry to file', async () => {
      const reg = new PlayerRegistry(tempFile);
      reg.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');

      await reg.save();

      const fileContent = await fs.readFile(tempFile, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data['john smith']).toBeDefined();
      expect(data['john smith'].duprId).toBe('ABC123');
      expect(data['john smith'].duprName).toBe('John A. Smith');
      expect(data['john smith'].rating).toBe(4.25);
    });

    it('should load registry from file', async () => {
      const data: RegistryData = {
        'john smith': {
          duprId: 'ABC123',
          duprName: 'John A. Smith',
          rating: 4.25,
          location: 'Edmonton',
          registeredAt: new Date().toISOString(),
        },
      };
      await fs.writeFile(tempFile, JSON.stringify(data), 'utf-8');

      const reg = new PlayerRegistry(tempFile);
      await reg.load();

      const player = reg.get('John Smith');
      expect(player).toBeDefined();
      expect(player?.duprId).toBe('ABC123');
      expect(player?.rating).toBe(4.25);
    });

    it('should handle load when file does not exist', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.json');
      const reg = new PlayerRegistry(nonExistentFile);

      // Should not throw, just start with empty registry
      await expect(reg.load()).resolves.toBeUndefined();
      expect(reg.size).toBe(0);
    });

    it('should round-trip save and load', async () => {
      const reg1 = new PlayerRegistry(tempFile);
      reg1.register('John Smith', 'ABC123', 'John A. Smith', 4.25, 'Edmonton');
      reg1.register('Jane Doe', 'DEF456', 'Jane B. Doe', 3.75, 'Calgary');

      await reg1.save();

      const reg2 = new PlayerRegistry(tempFile);
      await reg2.load();

      expect(reg2.size).toBe(2);
      expect(reg2.get('John Smith')?.duprId).toBe('ABC123');
      expect(reg2.get('Jane Doe')?.duprId).toBe('DEF456');
    });

    it('should handle save error for invalid directory', async () => {
      const invalidPath = '/nonexistent-dir-12345/invalid/registry.json';
      const reg = new PlayerRegistry(invalidPath);
      reg.register('John', 'A', 'John', 4.0, 'City');

      // Should not throw, just warn
      await expect(reg.save()).resolves.toBeUndefined();
    });
  });
});
