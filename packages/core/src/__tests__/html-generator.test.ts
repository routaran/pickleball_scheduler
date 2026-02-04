/**
 * Unit tests for html-generator module
 * Task: P1-HTMLGEN-2
 */

import {
  distributePlayersToPool,
  distributePlayersToPickleBrosPools,
  distributeTeamsToPool,
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  createTeamWithRatings,
  PlayerWithRating,
  TeamWithRatings,
  PlayerPool,
  TeamPool,
  POOL_TARGET_SIZE,
  POOL_MIN_SIZE,
  POOL_MAX_SIZE,
  PICKLEBROS_POOL_SIZE,
  RATING_TIER_HIGH,
  RATING_TIER_MID,
  COURTS_PER_POOL_LADDER,
  COURTS_PER_POOL_PARTNER,
  DEFAULT_LADDER_CONFIG,
  DEFAULT_PARTNER_CONFIG,
  CourtDistributionConfig,
  CourtDistributionResult,
  CourtDistributionErrorCode,
  getPoolCount,
  validateCourtDistribution,
  distributePlayersByCourtCount,
  distributeTeamsByCourtCount,
} from '../html-generator';

describe('html-generator', () => {
  // =============================================================================
  // Test Data Helpers
  // =============================================================================

  /**
   * Create a test player with default values
   */
  const createPlayer = (
    name: string,
    rating: number,
    found = true,
    searchMethod = 'exact'
  ): PlayerWithRating => ({
    name,
    rating,
    profileUrl: found ? `https://example.com/${name.toLowerCase().replace(/ /g, '-')}` : null,
    found,
    searchMethod: found ? searchMethod : 'default',
  });

  // Sample test data sets
  const players10 = [
    createPlayer('Player 1', 4.5),
    createPlayer('Player 2', 4.3),
    createPlayer('Player 3', 4.1),
    createPlayer('Player 4', 3.9),
    createPlayer('Player 5', 3.7),
    createPlayer('Player 6', 3.5),
    createPlayer('Player 7', 3.3),
    createPlayer('Player 8', 3.1),
    createPlayer('Player 9', 2.9),
    createPlayer('Player 10', 2.7),
  ];

  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe('constants', () => {
    it('should export POOL_TARGET_SIZE as 4', () => {
      expect(POOL_TARGET_SIZE).toBe(4);
    });

    it('should export POOL_MIN_SIZE as 4', () => {
      expect(POOL_MIN_SIZE).toBe(4);
    });

    it('should export POOL_MAX_SIZE as 5', () => {
      expect(POOL_MAX_SIZE).toBe(5);
    });

    it('should export PICKLEBROS_POOL_SIZE as 4', () => {
      expect(PICKLEBROS_POOL_SIZE).toBe(4);
    });

    it('should export RATING_TIER_HIGH as 4.0', () => {
      expect(RATING_TIER_HIGH).toBe(4.0);
    });

    it('should export RATING_TIER_MID as 3.0', () => {
      expect(RATING_TIER_MID).toBe(3.0);
    });

    it('should export COURTS_PER_POOL_LADDER as 1', () => {
      expect(COURTS_PER_POOL_LADDER).toBe(1);
    });

    it('should export COURTS_PER_POOL_PARTNER as 2', () => {
      expect(COURTS_PER_POOL_PARTNER).toBe(2);
    });

    it('should export DEFAULT_LADDER_CONFIG with correct values', () => {
      expect(DEFAULT_LADDER_CONFIG).toEqual({
        minPerPool: 4,
        maxPerPool: 5,
        courtsPerPool: 1,
      });
    });

    it('should export DEFAULT_PARTNER_CONFIG with correct values', () => {
      expect(DEFAULT_PARTNER_CONFIG).toEqual({
        minPerPool: 4,
        maxPerPool: 5,
        courtsPerPool: 2,
      });
    });
  });

  // =============================================================================
  // distributePlayersToPool Tests
  // =============================================================================

  describe('distributePlayersToPool', () => {
    it('should distribute 10 players into 2 pools of 5', () => {
      const pools = distributePlayersToPool(players10);

      expect(pools).toHaveLength(2);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(5);
      expect(pools[1].name).toBe('B');
      expect(pools[1].players).toHaveLength(5);
    });

    it('should give lower pools extra players (18 players → pools of 4,4,5,5)', () => {
      // 18 players with target 5 → 4 pools: 4+4+5+5
      const players18 = Array.from({ length: 18 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );

      const pools = distributePlayersToPool(players18);

      expect(pools).toHaveLength(4);
      // Lower pools (C, D) get extra players
      expect(pools[0].players.length).toBeLessThanOrEqual(pools[3].players.length);
      // Verify total players distributed
      const totalDistributed = pools.reduce((sum, pool) => sum + pool.players.length, 0);
      expect(totalDistributed).toBe(18);
    });

    it('should return empty array for empty input', () => {
      const pools = distributePlayersToPool([]);
      expect(pools).toEqual([]);
    });

    it('should create single pool for fewer than minSize players', () => {
      const players3 = players10.slice(0, 3);
      const pools = distributePlayersToPool(players3);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(3);
    });

    it('should create single pool for exactly minSize players', () => {
      const players4 = players10.slice(0, 4);
      const pools = distributePlayersToPool(players4);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
    });

    it('should sort players by rating (highest first)', () => {
      // Shuffle the players array to test sorting
      const shuffled = [
        createPlayer('Low', 2.5),
        createPlayer('High', 4.5),
        createPlayer('Mid', 3.5),
      ];
      const pools = distributePlayersToPool(shuffled);

      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[1].rating).toBe(3.5);
      expect(pools[0].players[2].rating).toBe(2.5);
    });

    it('should sort within each pool by rating (highest first)', () => {
      const pools = distributePlayersToPool(players10);

      // Pool A should have top 5 rated players
      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[4].rating).toBe(3.7);

      // Pool B should have lower rated players
      expect(pools[1].players[0].rating).toBe(3.5);
      expect(pools[1].players[4].rating).toBe(2.7);
    });

    it('should name pools alphabetically (A, B, C, D...)', () => {
      const players20 = Array.from({ length: 20 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPool(players20);

      expect(pools[0].name).toBe('A');
      expect(pools[1].name).toBe('B');
      expect(pools[2].name).toBe('C');
      expect(pools[3].name).toBe('D');
    });

    it('should handle 5 players as single pool', () => {
      const players5 = players10.slice(0, 5);
      const pools = distributePlayersToPool(players5);

      expect(pools).toHaveLength(1);
      expect(pools[0].players).toHaveLength(5);
    });

    it('should handle 6 players as single pool (less than 2 * minSize)', () => {
      const players6 = players10.slice(0, 6);
      const pools = distributePlayersToPool(players6);

      // 6 players: if we made 2 pools, each would have 3 (< minSize)
      // So it should be 1 pool of 6
      expect(pools).toHaveLength(1);
      expect(pools[0].players).toHaveLength(6);
    });

    it('should handle 8 players as 2 pools of 4', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPool(players8);

      expect(pools).toHaveLength(2);
      expect(pools[0].players).toHaveLength(4);
      expect(pools[1].players).toHaveLength(4);
    });

    it('should handle 9 players as 2 pools (4 and 5)', () => {
      const players9 = players10.slice(0, 9);
      const pools = distributePlayersToPool(players9);

      expect(pools).toHaveLength(2);
      // Lower pool (B) gets the extra player
      expect(pools[0].players.length + pools[1].players.length).toBe(9);
    });

    it('should handle single player input', () => {
      const player = [createPlayer('Solo', 3.5)];
      const pools = distributePlayersToPool(player);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(1);
    });

    it('should accept custom target and min sizes', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );

      // Use target 4, min 3
      const pools = distributePlayersToPool(players12, 4, 3);

      expect(pools).toHaveLength(3);
      pools.forEach((pool) => {
        expect(pool.players.length).toBe(4);
      });
    });
  });

  // =============================================================================
  // distributePlayersToPickleBrosPools Tests
  // =============================================================================

  describe('distributePlayersToPickleBrosPools', () => {
    it('should distribute 8 players into 2 pools of 4', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPickleBrosPools(players8);

      expect(pools).toHaveLength(2);
      expect(pools[0].players).toHaveLength(4);
      expect(pools[1].players).toHaveLength(4);
    });

    it('should distribute 12 players into 3 pools of 4', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPickleBrosPools(players12);

      expect(pools).toHaveLength(3);
      pools.forEach((pool) => {
        expect(pool.players).toHaveLength(4);
      });
    });

    it('should throw error for non-multiple of 4 (5 players)', () => {
      const players5 = players10.slice(0, 5);

      expect(() => distributePlayersToPickleBrosPools(players5)).toThrow(
        `PickleBros requires player count to be multiple of ${PICKLEBROS_POOL_SIZE}`
      );
    });

    it('should throw error for non-multiple of 4 (7 players)', () => {
      const players7 = players10.slice(0, 7);

      expect(() => distributePlayersToPickleBrosPools(players7)).toThrow();
    });

    it('should return empty array for empty input', () => {
      const pools = distributePlayersToPickleBrosPools([]);
      expect(pools).toEqual([]);
    });

    it('should distribute 4 players into 1 pool of 4', () => {
      const players4 = players10.slice(0, 4);
      const pools = distributePlayersToPickleBrosPools(players4);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
    });

    it('should sort players by rating (highest first)', () => {
      const shuffled = [
        createPlayer('P4', 3.0),
        createPlayer('P1', 4.5),
        createPlayer('P3', 3.5),
        createPlayer('P2', 4.0),
      ];
      const pools = distributePlayersToPickleBrosPools(shuffled);

      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[1].rating).toBe(4.0);
      expect(pools[0].players[2].rating).toBe(3.5);
      expect(pools[0].players[3].rating).toBe(3.0);
    });

    it('should name pools alphabetically (A, B, C...)', () => {
      const players16 = Array.from({ length: 16 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPickleBrosPools(players16);

      expect(pools[0].name).toBe('A');
      expect(pools[1].name).toBe('B');
      expect(pools[2].name).toBe('C');
      expect(pools[3].name).toBe('D');
    });

    it('should distribute top 4 to Pool A, next 4 to Pool B', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPickleBrosPools(players8);

      // Pool A should have top 4 rated players
      expect(pools[0].players.map((p) => p.rating)).toEqual([4.5, 4.3, 4.1, 3.9]);
      // Pool B should have next 4
      expect(pools[1].players.map((p) => p.rating)).toEqual([3.7, 3.5, 3.3, 3.1]);
    });
  });

  // =============================================================================
  // Court-Based Distribution Tests
  // =============================================================================

  describe('getPoolCount', () => {
    it('should return correct pool count for valid inputs', () => {
      expect(getPoolCount(2, 1)).toBe(2);
      expect(getPoolCount(4, 2)).toBe(2);
      expect(getPoolCount(6, 2)).toBe(3);
      expect(getPoolCount(10, 1)).toBe(10);
    });

    it('should throw error for non-positive court count', () => {
      expect(() => getPoolCount(0, 1)).toThrow('Court count must be a positive whole number');
      expect(() => getPoolCount(-2, 1)).toThrow('Court count must be a positive whole number');
    });

    it('should throw error for non-integer court count', () => {
      expect(() => getPoolCount(2.5, 1)).toThrow('Court count must be a positive whole number');
      expect(() => getPoolCount(3.7, 2)).toThrow('Court count must be a positive whole number');
    });

    it('should throw error when court count is not divisible by courtsPerPool', () => {
      expect(() => getPoolCount(3, 2)).toThrow('Court count must be a multiple of 2');
      expect(() => getPoolCount(5, 2)).toThrow('Court count must be a multiple of 2');
    });
  });

  describe('validateCourtDistribution', () => {
    it('should return success for valid inputs', () => {
      const result = validateCourtDistribution(8, 2, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(true);
    });

    it('should return INVALID_COURT_COUNT for zero courts', () => {
      const result = validateCourtDistribution(8, 0, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_COURT_COUNT');
        expect(result.error.message).toContain('positive whole number');
      }
    });

    it('should return INVALID_COURT_COUNT for negative courts', () => {
      const result = validateCourtDistribution(8, -2, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_COURT_COUNT');
      }
    });

    it('should return INVALID_COURT_COUNT for fractional courts', () => {
      const result = validateCourtDistribution(8, 2.5, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_COURT_COUNT');
      }
    });

    it('should return INVALID_COURT_COUNT for odd courts in Partner DUPR', () => {
      const result = validateCourtDistribution(8, 3, DEFAULT_PARTNER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_COURT_COUNT');
        expect(result.error.message).toContain('multiple of 2');
      }
    });

    it('should return TOO_FEW_PLAYERS when under minimum', () => {
      const result = validateCourtDistribution(3, 2, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOO_FEW_PLAYERS');
        expect(result.error.details.minRequired).toBe(8);
        expect(result.error.details.maxAllowed).toBe(10);
        expect(result.error.message).toContain('8-10 players');
        expect(result.error.message).toContain('You have 3');
      }
    });

    it('should return TOO_MANY_PLAYERS when over maximum', () => {
      const result = validateCourtDistribution(12, 2, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOO_MANY_PLAYERS');
        expect(result.error.details.maxAllowed).toBe(10);
        expect(result.error.message).toContain('at most 10 players');
        expect(result.error.message).toContain('You have 12');
      }
    });

    it('should return TOO_FEW_PLAYERS for empty players array', () => {
      const result = validateCourtDistribution(0, 2, DEFAULT_LADDER_CONFIG);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOO_FEW_PLAYERS');
      }
    });
  });

  describe('distributePlayersByCourtCount', () => {
    describe('success cases', () => {
      it('should distribute 8 players / 2 courts into 2 pools of 4 each', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          expect(result.pools[0].players).toHaveLength(4);
          expect(result.pools[1].players).toHaveLength(4);
          expect(result.pools[0].name).toBe('A');
          expect(result.pools[1].name).toBe('B');
        }
      });

      it('should distribute 9 players / 2 courts with Pool A=4, Pool B=5', () => {
        const players9 = players10.slice(0, 9);
        const result = distributePlayersByCourtCount(players9, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          // Pool A prefers 4 players
          expect(result.pools[0].players).toHaveLength(4);
          // Pool B gets the extra player
          expect(result.pools[1].players).toHaveLength(5);
        }
      });

      it('should distribute 10 players / 2 courts into 2 pools of 5 each', () => {
        const result = distributePlayersByCourtCount(players10, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          expect(result.pools[0].players).toHaveLength(5);
          expect(result.pools[1].players).toHaveLength(5);
        }
      });

      it('should distribute 16 players / 4 courts into 4 pools of 4 each', () => {
        const players16 = Array.from({ length: 16 }, (_, i) =>
          createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
        );
        const result = distributePlayersByCourtCount(players16, 4);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(4);
          result.pools.forEach((pool) => {
            expect(pool.players).toHaveLength(4);
          });
        }
      });

      it('should distribute 40 players / 10 courts into 10 pools of 4 each', () => {
        const players40 = Array.from({ length: 40 }, (_, i) =>
          createPlayer(`Player ${i + 1}`, 5.0 - i * 0.1)
        );
        const result = distributePlayersByCourtCount(players40, 10);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(10);
          result.pools.forEach((pool) => {
            expect(pool.players).toHaveLength(4);
          });
        }
      });

      it('should sort players by rating (highest first)', () => {
        const shuffled = [
          createPlayer('Low', 2.5),
          createPlayer('High', 4.5),
          createPlayer('Mid', 3.5),
          createPlayer('MidHigh', 4.0),
        ];
        const result = distributePlayersByCourtCount(shuffled, 1);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools[0].players[0].rating).toBe(4.5);
          expect(result.pools[0].players[1].rating).toBe(4.0);
          expect(result.pools[0].players[2].rating).toBe(3.5);
          expect(result.pools[0].players[3].rating).toBe(2.5);
        }
      });

      it('should put top rated players in Pool A', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          // Pool A should have top 4 rated players
          expect(result.pools[0].players.map((p) => p.rating)).toEqual([4.5, 4.3, 4.1, 3.9]);
          // Pool B should have lower rated players
          expect(result.pools[1].players.map((p) => p.rating)).toEqual([3.7, 3.5, 3.3, 3.1]);
        }
      });
    });

    describe('error cases', () => {
      it('should return TOO_FEW_PLAYERS for 3 players / 2 courts', () => {
        const players3 = players10.slice(0, 3);
        const result = distributePlayersByCourtCount(players3, 2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_FEW_PLAYERS');
        }
      });

      it('should return TOO_MANY_PLAYERS for 12 players / 2 courts', () => {
        const players12 = Array.from({ length: 12 }, (_, i) =>
          createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
        );
        const result = distributePlayersByCourtCount(players12, 2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_MANY_PLAYERS');
        }
      });

      it('should return INVALID_COURT_COUNT for 0 courts', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return INVALID_COURT_COUNT for negative court count', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, -2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return INVALID_COURT_COUNT for fractional court count', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 2.5);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return TOO_FEW_PLAYERS for empty players array', () => {
        const result = distributePlayersByCourtCount([], 2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_FEW_PLAYERS');
        }
      });
    });

    describe('edge cases', () => {
      it('should succeed at exactly minimum (8 players / 2 courts)', () => {
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          expect(result.pools[0].players).toHaveLength(4);
          expect(result.pools[1].players).toHaveLength(4);
        }
      });

      it('should succeed at exactly maximum (10 players / 2 courts)', () => {
        const result = distributePlayersByCourtCount(players10, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          expect(result.pools[0].players).toHaveLength(5);
          expect(result.pools[1].players).toHaveLength(5);
        }
      });

      it('should handle remainder = 0 case equally', () => {
        // 8 players / 2 courts → baseSize=4, remainder=0 → both pools get 4
        const players8 = players10.slice(0, 8);
        const result = distributePlayersByCourtCount(players8, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools[0].players).toHaveLength(4);
          expect(result.pools[1].players).toHaveLength(4);
        }
      });
    });
  });

  describe('distributeTeamsByCourtCount', () => {
    // Helper to create test teams
    const createTestTeam = (
      name1: string,
      rating1: number,
      name2: string,
      rating2: number
    ): TeamWithRatings => {
      return createTeamWithRatings(createPlayer(name1, rating1), createPlayer(name2, rating2));
    };

    describe('success cases', () => {
      it('should distribute 8 teams / 4 courts into 2 pools of 4 each', () => {
        const teams8 = Array.from({ length: 8 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0 - i * 0.1, `P${i * 2 + 2}`, 3.5 - i * 0.1)
        );
        const result = distributeTeamsByCourtCount(teams8, 4);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          expect(result.pools[0].teams).toHaveLength(4);
          expect(result.pools[1].teams).toHaveLength(4);
        }
      });

      it('should distribute 5 teams / 2 courts into 1 pool of 5', () => {
        const teams5 = Array.from({ length: 5 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0 - i * 0.1, `P${i * 2 + 2}`, 3.5 - i * 0.1)
        );
        const result = distributeTeamsByCourtCount(teams5, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(1);
          expect(result.pools[0].teams).toHaveLength(5);
        }
      });

      it('should distribute 9 teams / 4 courts with Pool A=4, Pool B=5', () => {
        const teams9 = Array.from({ length: 9 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0 - i * 0.1, `P${i * 2 + 2}`, 3.5 - i * 0.1)
        );
        const result = distributeTeamsByCourtCount(teams9, 4);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(2);
          // Pool A prefers 4 teams
          expect(result.pools[0].teams).toHaveLength(4);
          // Pool B gets the extra team
          expect(result.pools[1].teams).toHaveLength(5);
        }
      });

      it('should distribute 15 teams / 6 courts into 3 pools of 5', () => {
        const teams15 = Array.from({ length: 15 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0 - i * 0.05, `P${i * 2 + 2}`, 3.5 - i * 0.05)
        );
        const result = distributeTeamsByCourtCount(teams15, 6);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(3);
          result.pools.forEach((pool) => {
            expect(pool.teams).toHaveLength(5);
          });
        }
      });

      it('should distribute 18 teams / 8 courts with Pool A=4, B=4, C=5, D=5', () => {
        const teams18 = Array.from({ length: 18 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0 - i * 0.05, `P${i * 2 + 2}`, 3.5 - i * 0.05)
        );
        const result = distributeTeamsByCourtCount(teams18, 8);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.pools).toHaveLength(4);
          // baseSize = 4, remainder = 2 → Pool A and B get 4, Pool C and D get 5
          expect(result.pools[0].teams).toHaveLength(4);
          expect(result.pools[1].teams).toHaveLength(4);
          expect(result.pools[2].teams).toHaveLength(5);
          expect(result.pools[3].teams).toHaveLength(5);
        }
      });

      it('should sort teams by team rating (highest first)', () => {
        const teams = [
          createTestTeam('Low1', 2.5, 'Low2', 2.5),    // teamRating ~2.5
          createTestTeam('High1', 4.5, 'High2', 4.5),  // teamRating ~4.5
          createTestTeam('Mid1', 3.5, 'Mid2', 3.5),    // teamRating ~3.5
          createTestTeam('MidH1', 4.0, 'MidH2', 4.0),  // teamRating ~4.0
        ];
        const result = distributeTeamsByCourtCount(teams, 2);

        expect(result.success).toBe(true);
        if (result.success) {
          // Should be sorted by team rating descending
          expect(result.pools[0].teams[0].teamRating).toBeGreaterThan(result.pools[0].teams[1].teamRating);
        }
      });
    });

    describe('error cases', () => {
      it('should return INVALID_COURT_COUNT for 1 court (Partner DUPR needs 2)', () => {
        const teams4 = Array.from({ length: 4 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams4, 1);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
          expect(result.error.message).toContain('multiple of 2');
        }
      });

      it('should return INVALID_COURT_COUNT for odd court count (3 courts)', () => {
        const teams4 = Array.from({ length: 4 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams4, 3);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return TOO_FEW_PLAYERS for 3 teams / 4 courts', () => {
        const teams3 = Array.from({ length: 3 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams3, 4);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_FEW_PLAYERS');
        }
      });

      it('should return TOO_MANY_PLAYERS for 12 teams / 4 courts', () => {
        const teams12 = Array.from({ length: 12 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams12, 4);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_MANY_PLAYERS');
        }
      });

      it('should return INVALID_COURT_COUNT for 0 courts', () => {
        const teams4 = Array.from({ length: 4 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams4, 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return INVALID_COURT_COUNT for negative court count', () => {
        const teams4 = Array.from({ length: 4 }, (_, i) =>
          createTestTeam(`P${i * 2 + 1}`, 4.0, `P${i * 2 + 2}`, 3.5)
        );
        const result = distributeTeamsByCourtCount(teams4, -2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_COURT_COUNT');
        }
      });

      it('should return TOO_FEW_PLAYERS for empty teams array', () => {
        const result = distributeTeamsByCourtCount([], 2);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOO_FEW_PLAYERS');
        }
      });
    });
  });

  // =============================================================================
  // Rating Tier Tests
  // =============================================================================

  describe('rating tier classes', () => {
    it('should apply rating-high class for rating >= 4.0', () => {
      const player = createPlayer('High Rated', 4.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-high');
    });

    it('should apply rating-high class for rating 4.5', () => {
      const player = createPlayer('Very High', 4.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-high');
    });

    it('should apply rating-mid class for rating >= 3.0 and < 4.0', () => {
      const player = createPlayer('Mid Rated', 3.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-mid');
    });

    it('should apply rating-mid class for exactly 3.0', () => {
      const player = createPlayer('Exactly Mid', 3.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-mid');
    });

    it('should apply rating-low class for rating < 3.0', () => {
      const player = createPlayer('Low Rated', 2.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-low');
    });

    it('should apply rating-low class for rating 2.9', () => {
      const player = createPlayer('Just Below Mid', 2.9);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-low');
    });

    it('should correctly categorize multiple players across all tiers', () => {
      const players = [
        createPlayer('High', 4.2),
        createPlayer('Mid', 3.5),
        createPlayer('Low', 2.5),
      ];
      const html = generateDuprLadderHtml(players);

      expect(html).toContain('rating-high');
      expect(html).toContain('rating-mid');
      expect(html).toContain('rating-low');
    });
  });

  // =============================================================================
  // generateDuprLadderHtml Tests
  // =============================================================================

  describe('generateDuprLadderHtml', () => {
    it('should generate valid HTML structure with DOCTYPE', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain proper HTML head elements', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>DUPR Ladder Results</title>');
      expect(html).toContain('</head>');
    });

    it('should contain page title', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('DUPR Ladder');
      expect(html).toContain('class="page-title"');
    });

    it('should contain pool headers', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('pool-header');
    });

    it('should contain all player names', () => {
      const html = generateDuprLadderHtml(players10);

      players10.forEach((player) => {
        expect(html).toContain(player.name);
      });
    });

    it('should contain player ratings formatted to 2 decimal places', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('4.50'); // Player 1
      expect(html).toContain('4.30'); // Player 2
      expect(html).toContain('2.70'); // Player 10
    });

    it('should apply rating tier classes', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('rating-high'); // >= 4.0
      expect(html).toContain('rating-mid'); // >= 3.0
      expect(html).toContain('rating-low'); // < 3.0
    });

    it('should mark unfound players with not-found class', () => {
      const playersWithUnfound = [
        createPlayer('Found Player', 4.0, true),
        createPlayer('Unknown Player', 3.0, false),
      ];
      const html = generateDuprLadderHtml(playersWithUnfound);

      expect(html).toContain('not-found');
      expect(html).toContain('Unknown Player');
    });

    it('should show default badge for unfound players', () => {
      const playersWithUnfound = [createPlayer('Unknown', 3.0, false)];
      const html = generateDuprLadderHtml(playersWithUnfound);

      expect(html).toContain('badge-default');
      expect(html).toContain('Default');
    });

    it('should include profile links for found players', () => {
      const html = generateDuprLadderHtml([createPlayer('John Doe', 4.0, true)]);

      expect(html).toContain('profile-link');
      expect(html).toContain('href="https://example.com/john-doe"');
    });

    it('should not include profile links for unfound players', () => {
      const player = createPlayer('Unknown', 3.0, false);
      const html = generateDuprLadderHtml([player]);

      // No profile link element should be present for unfound player
      expect(html).not.toContain('href="https://example.com/unknown"');
    });

    it('should contain CSS styles', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain(':root');
    });

    it('should include player count in pool headers', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('(5 players)');
    });

    it('should contain rank badges', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('rank-badge');
    });

    it('should contain resolution summary', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('players resolved');
      expect(html).toContain('summary-card');
    });

    it('should handle empty player list', () => {
      const html = generateDuprLadderHtml([]);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('DUPR Ladder');
      expect(html).not.toContain('POOL A');
    });

    it('should escape HTML special characters in player names', () => {
      const player = createPlayer('Player <script>alert("XSS")</script>', 4.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  // =============================================================================
  // generatePartnerDuprHtml Tests
  // =============================================================================

  describe('generatePartnerDuprHtml', () => {
    const createTeams = (): TeamWithRatings[] => [
      createTeamWithRatings(createPlayer('Alice', 4.2), createPlayer('Bob', 3.8)),
      createTeamWithRatings(createPlayer('Carol', 4.0), createPlayer('Dave', 3.5)),
      createTeamWithRatings(createPlayer('Eve', 3.8), createPlayer('Frank', 3.2)),
    ];

    it('should generate valid HTML structure', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain page title', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Partner DUPR');
      expect(html).toContain('<title>Partner DUPR Results</title>');
    });

    it('should contain team ratings', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Team Rating');
      expect(html).toContain('team-dupr');
    });

    it('should sort teams by team rating (highest first)', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      // Find positions of team ratings in the HTML
      const aliceTeamPos = html.indexOf('Alice');
      const carolTeamPos = html.indexOf('Carol');
      const eveTeamPos = html.indexOf('Eve');

      // Alice/Bob team has highest rating, should appear first
      expect(aliceTeamPos).toBeLessThan(carolTeamPos);
      expect(carolTeamPos).toBeLessThan(eveTeamPos);
    });

    it('should show both player names', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
      expect(html).toContain('Carol');
      expect(html).toContain('Dave');
    });

    it('should show individual player ratings', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('individual-ratings');
      expect(html).toContain('4.20'); // Alice
      expect(html).toContain('3.80'); // Bob
    });

    it('should contain team count in header', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('3 Teams');
    });

    it('should contain players resolved count', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('6/6 players resolved');
    });

    it('should apply team tier classes', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      // Check for tier classes
      expect(html).toMatch(/tier-(highest|high|mid|low)/);
    });

    it('should contain table structure', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('<table class="partner-dupr-table">');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('</table>');
    });

    it('should handle teams with unfound players', () => {
      const teams = [
        createTeamWithRatings(
          createPlayer('Found', 4.0, true),
          createPlayer('Unknown', 3.0, false)
        ),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('not-found');
      expect(html).toContain('1/2 players resolved');
    });

    it('should handle empty teams array', () => {
      const html = generatePartnerDuprHtml([]);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Partner DUPR');
      expect(html).toContain('0 Teams');
    });

    it('should include team rank numbers', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('team-rank');
    });
  });

  // =============================================================================
  // generatePickleBrosMondayHtml Tests
  // =============================================================================

  describe('generatePickleBrosMondayHtml', () => {
    it('should generate valid HTML structure', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain page title', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('PickleBros Monday');
      expect(html).toContain('<title>PickleBros Monday Results</title>');
    });

    it('should contain pool headers A, B, C...', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const html = generatePickleBrosMondayHtml(players12);

      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('POOL C');
    });

    it('should show exactly 4 players per pool', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('(4 players)');
    });

    it('should throw error for invalid player count (5 players)', () => {
      const players5 = players10.slice(0, 5);

      expect(() => generatePickleBrosMondayHtml(players5)).toThrow();
    });

    it('should throw error for invalid player count (7 players)', () => {
      const players7 = players10.slice(0, 7);

      expect(() => generatePickleBrosMondayHtml(players7)).toThrow();
    });

    it('should include Fixed 4-Player Pools subtitle', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('Fixed 4-Player Pools');
    });

    it('should contain all player names', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      players8.forEach((player) => {
        expect(html).toContain(player.name);
      });
    });

    it('should contain rating tier classes', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('rating-high');
      expect(html).toContain('rating-mid');
    });

    it('should handle unfound players', () => {
      const players = [
        createPlayer('P1', 4.0),
        createPlayer('P2', 3.5),
        createPlayer('P3', 3.0, false),
        createPlayer('P4', 2.5),
      ];
      const html = generatePickleBrosMondayHtml(players);

      expect(html).toContain('not-found');
      expect(html).toContain('3/4 players resolved');
    });
  });

  // =============================================================================
  // createTeamWithRatings Tests
  // =============================================================================

  describe('createTeamWithRatings', () => {
    it('should calculate team rating correctly (35% higher + 65% lower)', () => {
      const p1 = createPlayer('Player 1', 4.25);
      const p2 = createPlayer('Player 2', 3.75);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 4.25 + 0.65 * 3.75 = 1.4875 + 2.4375 = 3.925
      expect(team.teamRating).toBeCloseTo(3.925, 3);
    });

    it('should include both players in the team', () => {
      const p1 = createPlayer('Alice', 4.0);
      const p2 = createPlayer('Bob', 3.5);
      const team = createTeamWithRatings(p1, p2);

      expect(team.player1.name).toBe('Alice');
      expect(team.player2.name).toBe('Bob');
    });

    it('should handle equal ratings', () => {
      const p1 = createPlayer('Player 1', 3.5);
      const p2 = createPlayer('Player 2', 3.5);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 3.5 + 0.65 * 3.5 = 3.5
      expect(team.teamRating).toBe(3.5);
    });

    it('should handle p1 lower than p2', () => {
      const p1 = createPlayer('Lower', 3.0);
      const p2 = createPlayer('Higher', 4.0);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 4.0 + 0.65 * 3.0 = 1.4 + 1.95 = 3.35
      expect(team.teamRating).toBe(3.35);
    });

    it('should round to 3 decimal places', () => {
      const p1 = createPlayer('P1', 4.123);
      const p2 = createPlayer('P2', 3.456);
      const team = createTeamWithRatings(p1, p2);

      const decimalPlaces = team.teamRating.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(3);
    });

    it('should handle extreme rating differences', () => {
      const p1 = createPlayer('P1', 5.0);
      const p2 = createPlayer('P2', 2.0);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 5.0 + 0.65 * 2.0 = 1.75 + 1.3 = 3.05
      expect(team.teamRating).toBe(3.05);
    });
  });

  // =============================================================================
  // Type Exports Tests
  // =============================================================================

  describe('type exports', () => {
    it('should export PlayerWithRating type', () => {
      const player: PlayerWithRating = {
        name: 'Test',
        rating: 3.5,
        profileUrl: null,
        found: true,
        searchMethod: 'exact',
      };
      expect(player).toBeDefined();
    });

    it('should export TeamWithRatings type', () => {
      const team: TeamWithRatings = {
        player1: createPlayer('P1', 4.0),
        player2: createPlayer('P2', 3.5),
        teamRating: 3.675,
      };
      expect(team).toBeDefined();
    });

    it('should export PlayerPool type', () => {
      const pool: PlayerPool = {
        name: 'A',
        players: [createPlayer('P1', 4.0)],
      };
      expect(pool).toBeDefined();
    });
  });

  // =============================================================================
  // Snapshot Tests
  // =============================================================================

  describe('snapshots', () => {
    // Helper to normalize timestamps in HTML for consistent snapshots
    const normalizeTimestamp = (html: string): string => {
      return html
        .replace(/\w+ \d{1,2}, \d{4}/g, '[DATE]')
        .replace(/Generated:.*?<\/p>/g, 'Generated: [TIMESTAMP]</p>');
    };

    it('should match ladder HTML snapshot', () => {
      const players = [
        createPlayer('John Smith', 4.25),
        createPlayer('Jane Doe', 3.75),
        createPlayer('Bob Wilson', 3.25),
        createPlayer('Alice Brown', 2.75),
      ];
      const html = generateDuprLadderHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match partner HTML snapshot', () => {
      const teams = [
        createTeamWithRatings(createPlayer('Alice', 4.0), createPlayer('Bob', 3.5)),
        createTeamWithRatings(createPlayer('Carol', 3.8), createPlayer('Dave', 3.2)),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match picklebros HTML snapshot', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const html = generatePickleBrosMondayHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with unfound players', () => {
      const players = [
        createPlayer('Found Player', 4.0, true),
        createPlayer('Unknown Player', 3.0, false),
        createPlayer('Another Found', 3.5, true),
        createPlayer('Missing Person', 2.5, false),
      ];
      const html = generateDuprLadderHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with mixed found/unfound', () => {
      const teams = [
        createTeamWithRatings(
          createPlayer('Found A', 4.0, true),
          createPlayer('Unknown B', 3.5, false)
        ),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });
  });
});
