/**
 * Tests for overrideStorage service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOverrides,
  saveOverride,
  deleteOverride,
  clearOverrides,
  PlayerOverride,
} from '../overrideStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('overrideStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverrides', () => {
    it('should return empty array when no overrides exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getOverrides();

      expect(result).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@dupr_player_overrides');
    });

    it('should return stored overrides', async () => {
      const mockOverrides: PlayerOverride[] = [
        {
          searchName: 'john smith',
          duprId: '12345',
          displayName: 'John Smith',
          rating: 4.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockOverrides));

      const result = await getOverrides();

      expect(result).toEqual(mockOverrides);
    });

    it('should return empty array on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getOverrides();

      expect(result).toEqual([]);
    });
  });

  describe('saveOverride', () => {
    it('should save a new override', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const override: PlayerOverride = {
        searchName: 'John Smith',
        duprId: '12345',
        displayName: 'John Smith',
        rating: 4.5,
      };

      await saveOverride(override);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dupr_player_overrides',
        JSON.stringify([
          {
            searchName: 'john smith',
            duprId: '12345',
            displayName: 'John Smith',
            rating: 4.5,
          },
        ])
      );
    });

    it('should replace existing override with same searchName', async () => {
      const existingOverrides: PlayerOverride[] = [
        {
          searchName: 'john smith',
          duprId: '12345',
          displayName: 'John Smith',
          rating: 4.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingOverrides));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newOverride: PlayerOverride = {
        searchName: 'John Smith',
        duprId: '67890',
        displayName: 'John A. Smith',
        rating: 5.0,
      };

      await saveOverride(newOverride);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dupr_player_overrides',
        JSON.stringify([
          {
            searchName: 'john smith',
            duprId: '67890',
            displayName: 'John A. Smith',
            rating: 5.0,
          },
        ])
      );
    });

    it('should add to existing overrides', async () => {
      const existingOverrides: PlayerOverride[] = [
        {
          searchName: 'jane doe',
          duprId: '11111',
          displayName: 'Jane Doe',
          rating: 3.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingOverrides));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newOverride: PlayerOverride = {
        searchName: 'John Smith',
        duprId: '12345',
        displayName: 'John Smith',
        rating: 4.5,
      };

      await saveOverride(newOverride);

      const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(saved).toHaveLength(2);
      expect(saved).toContainEqual(existingOverrides[0]);
      expect(saved).toContainEqual({
        searchName: 'john smith',
        duprId: '12345',
        displayName: 'John Smith',
        rating: 4.5,
      });
    });

    it('should throw error on storage failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const override: PlayerOverride = {
        searchName: 'John Smith',
        duprId: '12345',
        displayName: 'John Smith',
        rating: 4.5,
      };

      await expect(saveOverride(override)).rejects.toThrow('Failed to save override');
    });
  });

  describe('deleteOverride', () => {
    it('should delete override by searchName', async () => {
      const existingOverrides: PlayerOverride[] = [
        {
          searchName: 'john smith',
          duprId: '12345',
          displayName: 'John Smith',
          rating: 4.5,
        },
        {
          searchName: 'jane doe',
          duprId: '67890',
          displayName: 'Jane Doe',
          rating: 3.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingOverrides));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteOverride('John Smith');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dupr_player_overrides',
        JSON.stringify([existingOverrides[1]])
      );
    });

    it('should be case-insensitive', async () => {
      const existingOverrides: PlayerOverride[] = [
        {
          searchName: 'john smith',
          duprId: '12345',
          displayName: 'John Smith',
          rating: 4.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingOverrides));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteOverride('JOHN SMITH');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dupr_player_overrides',
        JSON.stringify([])
      );
    });

    it('should not fail if override does not exist', async () => {
      const existingOverrides: PlayerOverride[] = [
        {
          searchName: 'john smith',
          duprId: '12345',
          displayName: 'John Smith',
          rating: 4.5,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingOverrides));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await deleteOverride('Jane Doe');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dupr_player_overrides',
        JSON.stringify(existingOverrides)
      );
    });

    it('should throw error on storage failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(deleteOverride('John Smith')).rejects.toThrow('Failed to delete override');
    });
  });

  describe('clearOverrides', () => {
    it('should clear all overrides', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearOverrides();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@dupr_player_overrides');
    });

    it('should throw error on storage failure', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(clearOverrides()).rejects.toThrow('Failed to clear overrides');
    });
  });
});
